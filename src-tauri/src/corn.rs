// 定时任务：cron 到点后通过子进程执行命令（类似 node 的 child_process.spawn）。
// 到点后 `bun run <worker.ts>` 执行股票数据更新；worker.ts 由使用者自行维护。

use std::io::Read;
use std::process::{Child, Command, Stdio};
use std::str::FromStr;
use std::thread;
use std::time::Duration;

use chrono::{Local, TimeDelta};
use cron::Schedule;

/// 单条定时任务：schedule 命中后 spawn `program args`。
struct Job {
    name: String,
    schedule: Schedule,
    schedule_str: String,
    program: String,
    args: Vec<String>,
}

impl Job {
    fn new_from_cmd(name: &str, schedule_str: &str, (program, args): (String, Vec<String>)) -> Option<Self> {
        let schedule = Schedule::from_str(schedule_str).ok()?;
        Some(Self {
            name: name.into(),
            schedule,
            schedule_str: schedule_str.into(),
            program,
            args,
        })
    }
}

/// 启动所有定时任务（每个 Job 一个后台线程，进程退出时随之结束）。
pub fn init() {
    for job in build_jobs() {
        thread::spawn(move || run_job(job));
    }
}

fn build_jobs() -> Vec<Job> {
    let mut jobs = Vec::new();
    // (任务名, 6段cron: 秒 分 时 日 月 周, task 参数)
    let specs: &[(&str, &str, &str)] = &[
        ("update-morning-10", "0 0 10 * * 1-5",  "morning"),  // 周一~五 10:00
        ("update-morning-12", "0 10 12 * * 1-5", "morning"),  // 周一~五 12:10
        ("update-evening-10",    "0 10 14 * * 1-5", "evening"),  // 周一~五 14:10
        ("update-evening-30",    "0 30 14 * * 1-5", "evening"),  // 周一~五 14:30
    ];
    for (name, schedule, task) in specs {
        if let Some(j) = Job::new_from_cmd(name, schedule, tauri_stock_cron(task)) {
            jobs.push(j);
        }
    }
    jobs
}

fn tauri_stock_cron(task: &str) -> (String, Vec<String>) {
    handle_cron("tauri-stock", &["cron", "--task", task])
}

/// 处理 cron 任务：`cmd [额外参数...]`（cmd 由使用者维护）。
fn handle_cron(cmd: &str, extra_args: &[&str]) -> (String, Vec<String>) {
    let args = extra_args.iter().map(|s| s.to_string()).collect::<Vec<_>>();
    (cmd.into(), args)
}


fn run_job(job: Job) {
    match job.schedule.after(&Local::now()).next() {
        Some(next) => println!(
            "[corn] armed job='{}' schedule='{}' next at {}",
            job.name,
            job.schedule_str,
            next.format("%Y-%m-%d %H:%M:%S")
        ),
        None => {
            println!("[corn] job='{}' schedule='{}' never fires, skipped", job.name, job.schedule_str);
            return;
        }
    }

    loop {
        // 取下一个严格晚于当前时刻的触发点
        let Some(next) = job.schedule.after(&Local::now()).next() else {
            println!("[corn] job='{}' schedule='{}' has no future fire time, exit", job.name, job.schedule_str);
            return;
        };

        // 分块 sleep 直到触发点，避免一次性长睡而无法感知系统休眠/挂起
        loop {
            let remain_ms = (next - Local::now()).num_milliseconds();
            if remain_ms <= 1 {
                break;
            }
            thread::sleep(Duration::from_millis(remain_ms.min(60_000) as u64));
        }

        // 醒来核对：若远超预定时间（如机器休眠错过），跳过本次避免补跑
        if Local::now() - next > TimeDelta::seconds(120) {
            println!(
                "[corn] job='{}' missed run at {} (woke too late), skip",
                job.name,
                next.format("%Y-%m-%d %H:%M:%S")
            );
            continue;
        }

        println!("[corn] job='{}' trigger at {}", job.name, Local::now().format("%Y-%m-%d %H:%M:%S"));
        spawn_command(&job);
    }
}

/// 以子进程方式执行命令：stdout/stderr 交给后台线程读取（防止管道写满把子进程卡死）。
fn spawn_command(job: &Job) {
    let mut cmd = Command::new(&job.program);
    cmd.args(&job.args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW：不弹出子进程的黑框控制台窗口
        cmd.creation_flags(0x0800_0000);
    }

    match cmd.spawn() {
        Ok(child) => drain_output(job, child),
        Err(e) => println!("[corn] job='{}' spawn '{}' failed: {e}", job.name, job.program),
    }
}

fn drain_output(job: &Job, mut child: Child) {
    // stdout / stderr 各起一个线程读到 EOF（子进程退出即 EOF），防止管道写满把子进程卡死。
    // 读线程持有读端，子进程句柄随函数返回 drop 释放，进程本身继续在后台运行。
    let name = job.name.clone();
    if let Some(mut out) = child.stdout.take() {
        thread::spawn(move || {
            let mut buf = String::new();
            if out.read_to_string(&mut buf).is_ok() && !buf.is_empty() {
                println!("[corn:{name}] stdout: {buf}");
            }
        });
    }
    let name = job.name.clone();
    if let Some(mut err) = child.stderr.take() {
        thread::spawn(move || {
            let mut buf = String::new();
            if err.read_to_string(&mut buf).is_ok() && !buf.is_empty() {
                println!("[corn:{name}] stderr: {buf}");
            }
        });
    }
}
