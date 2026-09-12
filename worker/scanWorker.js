// @bun
// ../analysis/indicators.ts
import { readFileSync } from "fs";

// ../../node_modules/big.js/big.mjs
var DP = 20;
var RM = 1;
var MAX_DP = 1e6;
var MAX_POWER = 1e6;
var NE = -7;
var PE = 21;
var STRICT = false;
var NAME = "[big.js] ";
var INVALID = NAME + "Invalid ";
var INVALID_DP = INVALID + "decimal places";
var INVALID_RM = INVALID + "rounding mode";
var DIV_BY_ZERO = NAME + "Division by zero";
var P = {};
var UNDEFINED = undefined;
var NUMERIC = /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;
function _Big_() {
  function Big(n) {
    var x = this;
    if (!(x instanceof Big)) {
      return n === UNDEFINED && arguments.length === 0 ? _Big_() : new Big(n);
    }
    if (n instanceof Big) {
      x.s = n.s;
      x.e = n.e;
      x.c = n.c.slice();
    } else {
      if (typeof n !== "string") {
        if (Big.strict === true && typeof n !== "bigint") {
          throw TypeError(INVALID + "value");
        }
        n = n === 0 && 1 / n < 0 ? "-0" : String(n);
      }
      parse(x, n);
    }
    x.constructor = Big;
  }
  Big.prototype = P;
  Big.DP = DP;
  Big.RM = RM;
  Big.NE = NE;
  Big.PE = PE;
  Big.strict = STRICT;
  Big.roundDown = 0;
  Big.roundHalfUp = 1;
  Big.roundHalfEven = 2;
  Big.roundUp = 3;
  return Big;
}
function parse(x, n) {
  var e, i, nl;
  if (!NUMERIC.test(n)) {
    throw Error(INVALID + "number");
  }
  x.s = n.charAt(0) == "-" ? (n = n.slice(1), -1) : 1;
  if ((e = n.indexOf(".")) > -1)
    n = n.replace(".", "");
  if ((i = n.search(/e/i)) > 0) {
    if (e < 0)
      e = i;
    e += +n.slice(i + 1);
    n = n.substring(0, i);
  } else if (e < 0) {
    e = n.length;
  }
  nl = n.length;
  for (i = 0;i < nl && n.charAt(i) == "0"; )
    ++i;
  if (i == nl) {
    x.c = [x.e = 0];
  } else {
    for (;nl > 0 && n.charAt(--nl) == "0"; )
      ;
    x.e = e - i - 1;
    x.c = [];
    for (e = 0;i <= nl; )
      x.c[e++] = +n.charAt(i++);
  }
  return x;
}
function round(x, sd, rm, more) {
  var xc = x.c;
  if (rm === UNDEFINED)
    rm = x.constructor.RM;
  if (rm !== 0 && rm !== 1 && rm !== 2 && rm !== 3) {
    throw Error(INVALID_RM);
  }
  if (sd < 1) {
    more = rm === 3 && (more || !!xc[0]) || sd === 0 && (rm === 1 && xc[0] >= 5 || rm === 2 && (xc[0] > 5 || xc[0] === 5 && (more || xc[1] !== UNDEFINED)));
    xc.length = 1;
    if (more) {
      x.e = x.e - sd + 1;
      xc[0] = 1;
    } else {
      xc[0] = x.e = 0;
    }
  } else if (sd < xc.length) {
    more = rm === 1 && xc[sd] >= 5 || rm === 2 && (xc[sd] > 5 || xc[sd] === 5 && (more || xc[sd + 1] !== UNDEFINED || xc[sd - 1] & 1)) || rm === 3 && (more || !!xc[0]);
    xc.length = sd;
    if (more) {
      for (;++xc[--sd] > 9; ) {
        xc[sd] = 0;
        if (sd === 0) {
          ++x.e;
          xc.unshift(1);
          break;
        }
      }
    }
    for (sd = xc.length;!xc[--sd]; )
      xc.pop();
  }
  return x;
}
function stringify(x, doExponential, isNonzero) {
  var e = x.e, s = x.c.join(""), n = s.length;
  if (doExponential) {
    s = s.charAt(0) + (n > 1 ? "." + s.slice(1) : "") + (e < 0 ? "e" : "e+") + e;
  } else if (e < 0) {
    for (;++e; )
      s = "0" + s;
    s = "0." + s;
  } else if (e > 0) {
    if (++e > n) {
      for (e -= n;e--; )
        s += "0";
    } else if (e < n) {
      s = s.slice(0, e) + "." + s.slice(e);
    }
  } else if (n > 1) {
    s = s.charAt(0) + "." + s.slice(1);
  }
  return x.s < 0 && isNonzero ? "-" + s : s;
}
P.abs = function() {
  var x = new this.constructor(this);
  x.s = 1;
  return x;
};
P.cmp = function(y) {
  var isneg, x = this, xc = x.c, yc = (y = new x.constructor(y)).c, i = x.s, j = y.s, k = x.e, l = y.e;
  if (!xc[0] || !yc[0])
    return !xc[0] ? !yc[0] ? 0 : -j : i;
  if (i != j)
    return i;
  isneg = i < 0;
  if (k != l)
    return k > l ^ isneg ? 1 : -1;
  j = (k = xc.length) < (l = yc.length) ? k : l;
  for (i = -1;++i < j; ) {
    if (xc[i] != yc[i])
      return xc[i] > yc[i] ^ isneg ? 1 : -1;
  }
  return k == l ? 0 : k > l ^ isneg ? 1 : -1;
};
P.div = function(y) {
  var x = this, Big = x.constructor, a = x.c, b = (y = new Big(y)).c, k = x.s == y.s ? 1 : -1, dp = Big.DP;
  if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
    throw Error(INVALID_DP);
  }
  if (!b[0]) {
    throw Error(DIV_BY_ZERO);
  }
  if (!a[0]) {
    y.s = k;
    y.c = [y.e = 0];
    return y;
  }
  var bl, bt, n, cmp, ri, bz = b.slice(), ai = bl = b.length, al = a.length, r = a.slice(0, bl), rl = r.length, q = y, qc = q.c = [], qi = 0, p = dp + (q.e = x.e - y.e) + 1;
  q.s = k;
  k = p < 0 ? 0 : p;
  bz.unshift(0);
  for (;rl++ < bl; )
    r.push(0);
  do {
    for (n = 0;n < 10; n++) {
      if (bl != (rl = r.length)) {
        cmp = bl > rl ? 1 : -1;
      } else {
        for (ri = -1, cmp = 0;++ri < bl; ) {
          if (b[ri] != r[ri]) {
            cmp = b[ri] > r[ri] ? 1 : -1;
            break;
          }
        }
      }
      if (cmp < 0) {
        for (bt = rl == bl ? b : bz;rl; ) {
          if (r[--rl] < bt[rl]) {
            ri = rl;
            for (;ri && !r[--ri]; )
              r[ri] = 9;
            --r[ri];
            r[rl] += 10;
          }
          r[rl] -= bt[rl];
        }
        for (;!r[0]; )
          r.shift();
      } else {
        break;
      }
    }
    qc[qi++] = cmp ? n : ++n;
    if (r[0] && cmp)
      r[rl] = a[ai] || 0;
    else
      r = [a[ai]];
  } while ((ai++ < al || r[0] !== UNDEFINED) && k--);
  if (!qc[0] && qi != 1) {
    qc.shift();
    q.e--;
    p--;
  }
  if (qi > p)
    round(q, p, Big.RM, r[0] !== UNDEFINED);
  return q;
};
P.eq = function(y) {
  return this.cmp(y) === 0;
};
P.gt = function(y) {
  return this.cmp(y) > 0;
};
P.gte = function(y) {
  return this.cmp(y) > -1;
};
P.lt = function(y) {
  return this.cmp(y) < 0;
};
P.lte = function(y) {
  return this.cmp(y) < 1;
};
P.minus = P.sub = function(y) {
  var i, j, t, xlty, x = this, Big = x.constructor, a = x.s, b = (y = new Big(y)).s;
  if (a != b) {
    y.s = -b;
    return x.plus(y);
  }
  var xc = x.c.slice(), xe = x.e, yc = y.c, ye = y.e;
  if (!xc[0] || !yc[0]) {
    if (yc[0]) {
      y.s = -b;
    } else if (xc[0]) {
      y = new Big(x);
    } else {
      y.s = 1;
    }
    return y;
  }
  if (a = xe - ye) {
    if (xlty = a < 0) {
      a = -a;
      t = xc;
    } else {
      ye = xe;
      t = yc;
    }
    t.reverse();
    for (b = a;b--; )
      t.push(0);
    t.reverse();
  } else {
    j = ((xlty = xc.length < yc.length) ? xc : yc).length;
    for (a = b = 0;b < j; b++) {
      if (xc[b] != yc[b]) {
        xlty = xc[b] < yc[b];
        break;
      }
    }
  }
  if (xlty) {
    t = xc;
    xc = yc;
    yc = t;
    y.s = -y.s;
  }
  if ((b = (j = yc.length) - (i = xc.length)) > 0)
    for (;b--; )
      xc[i++] = 0;
  for (b = i;j > a; ) {
    if (xc[--j] < yc[j]) {
      for (i = j;i && !xc[--i]; )
        xc[i] = 9;
      --xc[i];
      xc[j] += 10;
    }
    xc[j] -= yc[j];
  }
  for (;xc[--b] === 0; )
    xc.pop();
  for (;xc[0] === 0; ) {
    xc.shift();
    --ye;
  }
  if (!xc[0]) {
    y.s = 1;
    xc = [ye = 0];
  }
  y.c = xc;
  y.e = ye;
  return y;
};
P.mod = function(y) {
  var ygtx, x = this, Big = x.constructor, a = x.s, b = (y = new Big(y)).s;
  if (!y.c[0]) {
    throw Error(DIV_BY_ZERO);
  }
  x.s = y.s = 1;
  ygtx = y.cmp(x) == 1;
  x.s = a;
  y.s = b;
  if (ygtx)
    return new Big(x);
  a = Big.DP;
  b = Big.RM;
  Big.DP = Big.RM = 0;
  x = x.div(y);
  Big.DP = a;
  Big.RM = b;
  return this.minus(x.times(y));
};
P.neg = function() {
  var x = new this.constructor(this);
  x.s = -x.s;
  return x;
};
P.plus = P.add = function(y) {
  var e, k, t, x = this, Big = x.constructor;
  y = new Big(y);
  if (x.s != y.s) {
    y.s = -y.s;
    return x.minus(y);
  }
  var { e: xe, c: xc } = x, ye = y.e, yc = y.c;
  if (!xc[0] || !yc[0]) {
    if (!yc[0]) {
      if (xc[0]) {
        y = new Big(x);
      } else {
        y.s = x.s;
      }
    }
    return y;
  }
  xc = xc.slice();
  if (e = xe - ye) {
    if (e > 0) {
      ye = xe;
      t = yc;
    } else {
      e = -e;
      t = xc;
    }
    t.reverse();
    for (;e--; )
      t.push(0);
    t.reverse();
  }
  if (xc.length - yc.length < 0) {
    t = yc;
    yc = xc;
    xc = t;
  }
  e = yc.length;
  for (k = 0;e; xc[e] %= 10)
    k = (xc[--e] = xc[e] + yc[e] + k) / 10 | 0;
  if (k) {
    xc.unshift(k);
    ++ye;
  }
  for (e = xc.length;xc[--e] === 0; )
    xc.pop();
  y.c = xc;
  y.e = ye;
  return y;
};
P.pow = function(n) {
  var x = this, one = new x.constructor("1"), y = one, isneg = n < 0;
  if (n !== ~~n || n < -MAX_POWER || n > MAX_POWER) {
    throw Error(INVALID + "exponent");
  }
  if (isneg)
    n = -n;
  for (;; ) {
    if (n & 1)
      y = y.times(x);
    n >>= 1;
    if (!n)
      break;
    x = x.times(x);
  }
  return isneg ? one.div(y) : y;
};
P.prec = function(sd, rm) {
  if (sd !== ~~sd || sd < 1 || sd > MAX_DP) {
    throw Error(INVALID + "precision");
  }
  return round(new this.constructor(this), sd, rm);
};
P.round = function(dp, rm) {
  if (dp === UNDEFINED)
    dp = 0;
  else if (dp !== ~~dp || dp < -MAX_DP || dp > MAX_DP) {
    throw Error(INVALID_DP);
  }
  return round(new this.constructor(this), dp + this.e + 1, rm);
};
P.sqrt = function() {
  var r, c, t, x = this, Big = x.constructor, s = x.s, e = x.e, half = new Big("0.5");
  if (!x.c[0])
    return new Big(x);
  if (s < 0) {
    throw Error(NAME + "No square root");
  }
  s = Math.sqrt(+stringify(x, true, true));
  if (s === 0 || s === 1 / 0) {
    c = x.c.join("");
    if (!(c.length + e & 1))
      c += "0";
    s = Math.sqrt(c);
    e = ((e + 1) / 2 | 0) - (e < 0 || e & 1);
    r = new Big((s == 1 / 0 ? "5e" : (s = s.toExponential()).slice(0, s.indexOf("e") + 1)) + e);
  } else {
    r = new Big(s + "");
  }
  e = r.e + (Big.DP += 4);
  do {
    t = r;
    r = half.times(t.plus(x.div(t)));
  } while (t.c.slice(0, e).join("") !== r.c.slice(0, e).join(""));
  return round(r, (Big.DP -= 4) + r.e + 1, Big.RM);
};
P.times = P.mul = function(y) {
  var c, x = this, Big = x.constructor, xc = x.c, yc = (y = new Big(y)).c, a = xc.length, b = yc.length, i = x.e, j = y.e;
  y.s = x.s == y.s ? 1 : -1;
  if (!xc[0] || !yc[0]) {
    y.c = [y.e = 0];
    return y;
  }
  y.e = i + j;
  if (a < b) {
    c = xc;
    xc = yc;
    yc = c;
    j = a;
    a = b;
    b = j;
  }
  for (c = new Array(j = a + b);j--; )
    c[j] = 0;
  for (i = b;i--; ) {
    b = 0;
    for (j = a + i;j > i; ) {
      b = c[j] + yc[i] * xc[j - i - 1] + b;
      c[j--] = b % 10;
      b = b / 10 | 0;
    }
    c[j] = b;
  }
  if (b)
    ++y.e;
  else
    c.shift();
  for (i = c.length;!c[--i]; )
    c.pop();
  y.c = c;
  return y;
};
P.toExponential = function(dp, rm) {
  var x = this, n = x.c[0];
  if (dp !== UNDEFINED) {
    if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
      throw Error(INVALID_DP);
    }
    x = round(new x.constructor(x), ++dp, rm);
    for (;x.c.length < dp; )
      x.c.push(0);
  }
  return stringify(x, true, !!n);
};
P.toFixed = function(dp, rm) {
  var x = this, n = x.c[0];
  if (dp !== UNDEFINED) {
    if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
      throw Error(INVALID_DP);
    }
    x = round(new x.constructor(x), dp + x.e + 1, rm);
    for (dp = dp + x.e + 1;x.c.length < dp; )
      x.c.push(0);
  }
  return stringify(x, false, !!n);
};
P.toJSON = P.toString = function() {
  var x = this, Big = x.constructor;
  return stringify(x, x.e <= Big.NE || x.e >= Big.PE, !!x.c[0]);
};
if (typeof Symbol !== "undefined") {
  P[Symbol.for("nodejs.util.inspect.custom")] = P.toJSON;
}
P.toNumber = function() {
  var n = +stringify(this, true, true);
  if (this.constructor.strict === true && !this.eq(n.toString())) {
    throw Error(NAME + "Imprecise conversion");
  }
  return n;
};
P.toPrecision = function(sd, rm) {
  var x = this, Big = x.constructor, n = x.c[0];
  if (sd !== UNDEFINED) {
    if (sd !== ~~sd || sd < 1 || sd > MAX_DP) {
      throw Error(INVALID + "precision");
    }
    x = round(new Big(x), sd, rm);
    for (;x.c.length < sd; )
      x.c.push(0);
  }
  return stringify(x, sd <= x.e || x.e <= Big.NE || x.e >= Big.PE, !!n);
};
P.valueOf = function() {
  var x = this, Big = x.constructor;
  if (Big.strict === true) {
    throw Error(NAME + "valueOf disallowed");
  }
  return stringify(x, x.e <= Big.NE || x.e >= Big.PE, true);
};
var Big = _Big_();
var big_default = Big;

// ../utils/math.ts
var add = function(number1, number2) {
  const a = new big_default(Number(number1) || 0);
  const b = new big_default(Number(number2) || 0);
  return Number(a.plus(b).valueOf());
};
var subtract = function(number1, number2) {
  const a = new big_default(Number(number1) || 0);
  const b = new big_default(Number(number2) || 0);
  return Number(a.minus(b).valueOf());
};
var multiply = function(number1, number2) {
  const a = new big_default(Number(number1) || 0);
  const b = new big_default(Number(number2) || 0);
  return Number(a.times(b).valueOf());
};
var divide = function(number1, number2) {
  const a = new big_default(Number(number1) || 0);
  const b = new big_default(Number(number2) ? number2 : 1);
  return Number(a.div(b).valueOf());
};
var round2 = (number, precision = 2) => {
  return Number(new big_default(Number(number) || 0).round(precision).valueOf());
};

// ../analysis/indicators.ts
function roundTo(v, digits) {
  return round2(v, digits);
}
function lastOpt(values) {
  const v = values[values.length - 1];
  return v ?? null;
}
function sma(values, period) {
  if (values.length < period)
    return values.map(() => null);
  const result = new Array(period - 1).fill(null);
  for (let i = period - 1;i < values.length; i++) {
    let sum = 0;
    for (let j = i + 1 - period;j <= i; j++)
      sum += values[j];
    result.push(round2(divide(sum, period), 3));
  }
  return result;
}
function ema(values, period) {
  if (values.length === 0)
    return [];
  const result = [values[0]];
  const k = divide(2, period + 1);
  for (let i = 1;i < values.length; i++) {
    result.push(add(multiply(values[i], k), multiply(result[result.length - 1], subtract(1, k))));
  }
  return result;
}
function calcMacd(values) {
  const ema12 = ema(values, 12);
  const ema26 = ema(values, 26);
  const dif = ema12.map((a, i) => subtract(a, ema26[i]));
  const dea = ema(dif, 9);
  const bar = dif.map((d, i) => multiply(2, subtract(d, dea[i])));
  const macd = bar.map((v) => round2(v));
  return { dif, dea, bar, macd };
}
function calcBoll(values, period, k) {
  if (values.length < period)
    return values.map(() => null);
  const result = new Array(period - 1).fill(null);
  for (let i = period - 1;i < values.length; i++) {
    const window = values.slice(i + 1 - period, i + 1);
    const mid = window.reduce((a, b) => a + b, 0) / period;
    const variance = window.reduce((a, b) => a + (b - mid) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    result.push({
      mid: roundTo(mid, 2),
      up: roundTo(mid + k * sd, 2),
      dn: roundTo(mid - k * sd, 2)
    });
  }
  return result;
}
function calcRsi(values, period) {
  if (values.length <= period)
    return values.map(() => null);
  const result = new Array(period).fill(null);
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1;i <= period; i++) {
    const change = values[i] - values[i - 1];
    if (change > 0)
      avgGain += change;
    else
      avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;
  result.push(avgLoss === 0 ? 100 : roundTo(100 - 100 / (1 + avgGain / avgLoss), 2));
  for (let i = period + 1;i < values.length; i++) {
    const change = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
    result.push(avgLoss === 0 ? 100 : roundTo(100 - 100 / (1 + avgGain / avgLoss), 2));
  }
  return result;
}
function calcObv(klines) {
  if (klines.length === 0)
    return [];
  const result = [0];
  for (let i = 1;i < klines.length; i++) {
    const prev = result[result.length - 1];
    if (klines[i].close > klines[i - 1].close)
      result.push(add(prev, klines[i].vol));
    else if (klines[i].close < klines[i - 1].close)
      result.push(subtract(prev, klines[i].vol));
    else
      result.push(prev);
  }
  return result;
}
function calcKdj(values, n, k, d) {
  const len = values.length;
  if (len < n)
    return { k: new Array(len).fill(50), d: new Array(len).fill(50), j: new Array(len).fill(50) };
  const rsv = new Array(len).fill(50);
  for (let i = n - 1;i < len; i++) {
    const window = values.slice(i + 1 - n, i + 1);
    const minVal = Math.min(...window);
    const maxVal = Math.max(...window);
    if (maxVal - minVal > 0.0000000001)
      rsv[i] = (values[i] - minVal) / (maxVal - minVal) * 100;
  }
  const kFactor = 2 / (k + 1);
  const dFactor = 2 / (d + 1);
  const k_vals = new Array(len).fill(50);
  const d_vals = new Array(len).fill(50);
  for (let i = n - 1;i < len; i++) {
    k_vals[i] = (1 - kFactor) * k_vals[i - 1] + kFactor * rsv[i];
    d_vals[i] = (1 - dFactor) * d_vals[i - 1] + dFactor * k_vals[i];
  }
  const j_vals = k_vals.map((kv, i) => 3 * kv - 2 * d_vals[i]);
  return { k: k_vals, d: d_vals, j: j_vals };
}
function calcCci(high, low, close, period) {
  const len = close.length;
  if (len < period)
    return new Array(len).fill(null);
  const tp = high.map((h, i) => (h + low[i] + close[i]) / 3);
  const tp_sma = sma(tp, period);
  const result = new Array(period - 1).fill(null);
  for (let i = period - 1;i < len; i++) {
    const tpVal = tp[i];
    const smaVal = tp_sma[i];
    const md = tp.slice(i + 1 - period, i + 1).reduce((a, b) => a + Math.abs(b - smaVal), 0) / period;
    result.push(md > 0.0000000001 ? roundTo((tpVal - smaVal) / (0.015 * md), 2) : 0);
  }
  return result;
}
function parseKlineFromJson(jsonStr, isFilter = false) {
  const root = JSON.parse(jsonStr);
  const dataObj = root?.data;
  if (!dataObj)
    throw new Error("\u672A\u627E\u5230 data \u5B57\u6BB5");
  const symbolKey = Object.keys(dataObj)[0];
  if (!symbolKey)
    throw new Error("data \u5BF9\u8C61\u4E3A\u7A7A");
  const symbolData = dataObj[symbolKey];
  const series = symbolData?.qfqday ?? symbolData?.day;
  if (isFilter && parseInt(symbolData.qt[symbolKey][6]) === 0) {
    throw new Error("\u80A1\u7968\u5DF2\u7ECF\u505C\u724C");
  }
  if (!series || !Array.isArray(series))
    throw new Error("\u672A\u627E\u5230 qfqday/day K\u7EBF\u6570\u636E");
  const klines = [];
  for (const row of series) {
    if (!Array.isArray(row) || row.length < 6)
      continue;
    klines.push({
      date: String(row[0] ?? ""),
      open: parseFloat(row[1]) || 0,
      close: parseFloat(row[2]) || 0,
      high: parseFloat(row[3]) || 0,
      low: parseFloat(row[4]) || 0,
      vol: parseFloat(row[5]) || 0
    });
  }
  if (klines.length === 0)
    throw new Error("K\u7EBF\u6570\u636E\u4E3A\u7A7A");
  return klines;
}
function analyzeKlines(klines, code = "", name = "") {
  const close = klines.map((k) => k.close);
  const high = klines.map((k) => k.high);
  const low = klines.map((k) => k.low);
  const vol = klines.map((k) => k.vol);
  const { dif, dea, bar, macd } = calcMacd(close);
  const { k: k_vals, d: d_vals, j: j_vals } = calcKdj(close, 9, 3, 3);
  return {
    code,
    name,
    close,
    high,
    low,
    vol,
    ma5: sma(close, 5),
    ma10: sma(close, 10),
    ma20: sma(close, 20),
    ma60: sma(close, 60),
    bb: calcBoll(close, 20, 2),
    macd_dif: dif,
    macd_dea: dea,
    macd_bar: bar,
    macd_macd: macd,
    rsi: calcRsi(close, 14),
    obv: calcObv(klines),
    k: k_vals,
    d: d_vals,
    j: j_vals,
    cci: calcCci(high, low, close, 14),
    klines
  };
}
function loadAndAnalyze(filePath, name, rebackNum = 0) {
  const code = filePath.split(/[\\/]/).pop()?.replace(".json", "") ?? "";
  const jsonStr = readFileSync(filePath, "utf-8");
  const klines = parseKlineFromJson(jsonStr);
  if (klines.length < 30)
    throw new Error(`K\u7EBF\u6570\u636E\u4E0D\u8DB3\uFF08\u4EC5 ${klines.length} \u6761\uFF09\uFF0C\u9700\u8981\u81F3\u5C11 30 \u6761\u6570\u636E`);
  const analysis = analyzeKlines(rebackNum > 0 ? klines.slice(0, 0 - rebackNum) : klines, code, name);
  const root = JSON.parse(jsonStr);
  const dataObj = root?.data;
  if (!dataObj)
    throw new Error("\u672A\u627E\u5230 data \u5B57\u6BB5");
  const symbolKey = Object.keys(dataObj)[0];
  if (!symbolKey)
    throw new Error("data \u5BF9\u8C61\u4E3A\u7A7A");
  const symbolData = dataObj[symbolKey];
  const info = symbolData.qt[symbolKey];
  return {
    code,
    analysis,
    klines: rebackNum > 0 ? klines.slice(0, 0 - rebackNum) : klines,
    turnoverRate: Number(info[38]),
    priceChange: Number(info[32]),
    pe: Number(info[39])
  };
}

// ../scan/scanOne.ts
import { join } from "path";

// ../scan/patterns/maAlignedUpSmallGain.ts
var MAX_BIAS20 = 15;
function maAlignedUpSmallGain(analysis, turnoverRate, pe) {
  const { ma5, ma10, ma20, klines } = analysis;
  if (turnoverRate < 1 || turnoverRate > 10)
    return null;
  if (pe <= 0)
    return null;
  const values = analysis.vol;
  const lastIdx = klines.length - 1;
  const lastBar = klines[lastIdx];
  const vMa5 = ma5[lastIdx];
  const vMa10 = ma10[lastIdx];
  const vMa20 = ma20[lastIdx];
  if (vMa5 == null || vMa10 == null || vMa20 == null)
    return null;
  if (!(vMa5 > vMa10 && vMa10 > vMa20))
    return null;
  for (let i = 1;i <= 6; i++) {
    const cur = ma20[lastIdx - i + 1];
    const prev = ma20[lastIdx - i];
    if (prev == null || cur == null || cur <= prev)
      return null;
  }
  const bias20 = (lastBar.close - vMa20) / vMa20 * 100;
  if (bias20 > MAX_BIAS20)
    return null;
  if (lastBar.close <= lastBar.open)
    return null;
  if (klines.length < 2)
    return null;
  const prevBar = klines[lastIdx - 1];
  const gainFromKline = (lastBar.close - prevBar.close) / prevBar.close * 100;
  if (gainFromKline <= 0 || gainFromKline > 2)
    return null;
  if (lastBar.close + lastBar.open <= vMa5 * 2)
    return null;
  const macd = analysis.macd_macd;
  if (macd.length < 3)
    return null;
  const lastMacd = macd[macd.length - 1];
  const prevMacd1 = macd[macd.length - 2];
  const prevMacd2 = macd[macd.length - 3];
  if (!(lastMacd > 0 && prevMacd1 > 0 && prevMacd2 > 0))
    return null;
  if (!(lastMacd > prevMacd1 && prevMacd1 > prevMacd2))
    return null;
  if (values.length < 3)
    return null;
  const lastEnd = values[values.length - 1];
  const prevEnd = values[values.length - 2];
  const prevPrevEnd = values[values.length - 3];
  if (lastEnd <= prevEnd && prevEnd <= prevPrevEnd)
    return null;
  return true;
}

// ../utils/ma.ts
function ma5(a, i) {
  return a.ma5[i] ?? 0;
}
var findLocalMinIndices = (values, lookRange) => {
  const result = [];
  for (let i = 0;i < values.length; i++) {
    const val = values[i];
    if (val === undefined || isNaN(val))
      continue;
    let isLowest = true;
    const start = Math.max(0, i - lookRange);
    const end = Math.min(values.length - 1, i + lookRange);
    for (let j = start;j <= end; j++) {
      if (j === i)
        continue;
      const other = values[j];
      if (other !== undefined && !isNaN(other) && other < val || other === val && j > i) {
        isLowest = false;
        break;
      }
    }
    if (isLowest)
      result.push(i);
  }
  return result;
};

// ../scan/patterns/lastLowBreakoutBuy.ts
function lastLowBreakoutBuy(analysis, pe) {
  const { klines } = analysis;
  if (klines.length < 10)
    return null;
  const { high, ma5: ma52, ma10, ma20 } = analysis;
  const closeValues = klines.map((v) => v === null ? undefined : v.close);
  const lowIndices = findLocalMinIndices(closeValues, 5);
  if (lowIndices.length === 0)
    return null;
  const lastLowIdx = lowIndices[lowIndices.length - 1];
  if (lastLowIdx < 3 || lastLowIdx + 2 >= klines.length)
    return null;
  let priorHigh = -Infinity;
  for (let j = lastLowIdx - 3;j < lastLowIdx; j++) {
    if (high[j] > priorHigh)
      priorHigh = high[j];
  }
  const lastIdx = klines.length - 1;
  const lastBar = klines[lastIdx];
  if (pe <= 0)
    return null;
  let conditionPass = false;
  let breakoutIdx = -1;
  for (let j = lastLowIdx + 2;j <= lastIdx; j++) {
    if (high[j] > priorHigh) {
      breakoutIdx = j;
      break;
    }
  }
  if (breakoutIdx === lastIdx) {
    if (lastBar.close > lastBar.open && !(lastIdx > 0 && lastBar.close <= klines[lastIdx - 1].close)) {
      conditionPass = true;
    }
  }
  if (!conditionPass && lastLowIdx === klines.length - 4) {
    let allBullish = true;
    for (let j = klines.length - 3;j <= klines.length - 1; j++) {
      if (klines[j].close <= klines[j].open) {
        allBullish = false;
        break;
      }
    }
    conditionPass = allBullish;
  }
  if (!conditionPass)
    return null;
  const lastMa5 = ma52[lastIdx];
  const lastMa10 = ma10[lastIdx];
  const lastMa20 = ma20[lastIdx];
  if (lastMa5 < lastMa10 && lastMa5 < lastMa20)
    return null;
  const prevClose = klines[lastIdx - 1].close;
  if (prevClose > 0 && (lastBar.close - prevClose) / prevClose > 0.08)
    return null;
  return true;
}

// ../scan/patterns/longShadow.ts
function limitUpThreshold(code) {
  if (code.startsWith("30") || code.startsWith("688"))
    return 0.195;
  return 0.095;
}
function hasLimitUpInLastN(code, klines, n) {
  const start = Math.max(1, klines.length - n);
  for (let j = klines.length - 1;j >= start; j--) {
    const prevClose = klines[j - 1].close;
    if (prevClose > 0 && (klines[j].close - prevClose) / prevClose >= limitUpThreshold(code)) {
      return true;
    }
  }
  return false;
}
var minShadowBodyRatio = 3;
function longShadow(code, analysis, pe) {
  const { ma5: ma52, ma10, ma20, klines } = analysis;
  if (pe <= 0)
    return null;
  if (hasLimitUpInLastN(code, klines, 3))
    return null;
  const maxUpperShadowRatio = 0.4;
  const minShadowPct = 2;
  const barIdx = klines.length - 1;
  const bar = klines[barIdx];
  const v5 = ma52[barIdx];
  const v10 = ma10[barIdx];
  const v20 = ma20[barIdx];
  if (v5 == null || v10 == null || v20 == null)
    return null;
  const prev10 = ma10[barIdx - 1];
  const prev20 = ma20[barIdx - 1];
  if (prev10 == null || prev20 == null)
    return null;
  if (v10 <= prev10 || v20 <= prev20)
    return null;
  const maxMa = Math.max(v5, v10);
  const minMa = Math.min(v5, v10);
  if (bar.high < minMa || bar.low > maxMa)
    return null;
  let maxHighRecent = 0;
  for (let j = Math.max(0, barIdx - 3);j <= barIdx; j++) {
    maxHighRecent = Math.max(maxHighRecent, klines[j].high);
  }
  if (bar.high >= maxHighRecent)
    return null;
  const body = Math.abs(bar.close - bar.open);
  const upperShadow = bar.high - Math.max(bar.open, bar.close);
  const lowerShadow = Math.min(bar.open, bar.close) - bar.low;
  if (body <= 0 || lowerShadow <= 0)
    return null;
  if (lowerShadow / body <= minShadowBodyRatio)
    return null;
  if (lowerShadow < bar.close * minShadowPct / 100)
    return null;
  if (upperShadow > body * maxUpperShadowRatio)
    return null;
  return true;
}

// ../scan/patterns/ma5ReversalCross.ts
var WINDOW = 100;
var TROUGH_LOOKBACK = 5;
var MIN_DECLINE_BARS = 15;
var MIN_DECLINE_PCT = 0.15;
var MAX_UP_TICK_RATIO = 0.3;
var MAX_DIST_LOW = 0.05;
var MAX_PRICE_TROUGH = 0.06;
var MIN_BARS = 100;
function ma5ReversalCross(analysis) {
  const { ma5: ma52, klines } = analysis;
  const lastIdx = klines.length - 1;
  const bar = klines[lastIdx];
  if (lastIdx < MIN_BARS - 1)
    return null;
  const m5 = ma52[lastIdx];
  const m5_1 = ma52[lastIdx - 1];
  if (m5 == null || m5_1 == null)
    return null;
  const ma5Win = ma52.slice(-WINDOW);
  const last = ma5Win.length - 1;
  const m5Now = ma5Win[last];
  if (m5Now == null)
    return null;
  let winMin = Infinity;
  for (let i = 0;i < ma5Win.length; i++) {
    const v = ma5Win[i];
    if (v != null && v < winMin)
      winMin = v;
  }
  if (winMin <= 0)
    return null;
  if ((m5Now - winMin) / winMin > MAX_DIST_LOW)
    return null;
  let troughIdx = last;
  for (let i = Math.max(0, last - TROUGH_LOOKBACK + 1);i <= last; i++) {
    const v = ma5Win[i];
    if (v == null)
      return null;
    if (v < ma5Win[troughIdx])
      troughIdx = i;
  }
  const troughVal = ma5Win[troughIdx];
  if (troughIdx === last)
    return null;
  if (m5Now <= troughVal)
    return null;
  if (m5Now <= m5_1)
    return null;
  let peakIdx = -1;
  let peakVal = -Infinity;
  for (let i = 0;i <= troughIdx; i++) {
    const v = ma5Win[i];
    if (v == null)
      continue;
    if (v > peakVal) {
      peakVal = v;
      peakIdx = i;
    }
  }
  if (peakIdx < 0 || peakVal <= 0)
    return null;
  const declineBars = troughIdx - peakIdx;
  const declinePct = (peakVal - troughVal) / peakVal;
  if (declineBars < MIN_DECLINE_BARS)
    return null;
  if (declinePct < MIN_DECLINE_PCT)
    return null;
  let upTicks = 0;
  for (let i = peakIdx + 1;i <= troughIdx; i++) {
    const prev = ma5Win[i - 1];
    const cur = ma5Win[i];
    if (prev != null && cur != null && cur > prev)
      upTicks++;
  }
  if (upTicks > Math.max(2, Math.floor(declineBars * MAX_UP_TICK_RATIO)))
    return null;
  if ((bar.close - troughVal) / troughVal > MAX_PRICE_TROUGH)
    return null;
  if (bar.close <= m5)
    return null;
  if (bar.close <= bar.open)
    return null;
  return true;
}

// ../scan/patterns/consecutiveRise.ts
function noMaCross(a, start, end) {
  const v5s = a.ma5[start];
  const v10s = a.ma10[start];
  const v20s = a.ma20[start];
  if (v5s == null || v10s == null || v20s == null)
    return false;
  const init5v10 = v5s - v10s;
  const init5v20 = v5s - v20s;
  const init10v20 = v10s - v20s;
  for (let i = start + 1;i <= end; i++) {
    const v5 = a.ma5[i];
    const v10 = a.ma10[i];
    const v20 = a.ma20[i];
    if (v5 == null || v10 == null || v20 == null)
      return false;
    if (v5 < v10 || v5 < v20 || v10 < v20)
      return false;
    if (init5v10 > 0 && v5 <= v10)
      return false;
    if (init5v10 < 0 && v5 >= v10)
      return false;
    if (init5v10 === 0 && v5 !== v10)
      return false;
    if (init5v20 > 0 && v5 <= v20)
      return false;
    if (init5v20 < 0 && v5 >= v20)
      return false;
    if (init5v20 === 0 && v5 !== v20)
      return false;
    if (init10v20 > 0 && v10 <= v20)
      return false;
    if (init10v20 < 0 && v10 >= v20)
      return false;
    if (init10v20 === 0 && v10 !== v20)
      return false;
  }
  return true;
}
function isArcTop(a) {
  const n = a.close.length;
  const m0 = a.ma5[n - 4];
  const m1 = a.ma5[n - 3];
  const m2 = a.ma5[n - 2];
  const m3 = a.ma5[n - 1];
  if (m0 == null || m1 == null || m2 == null || m3 == null)
    return false;
  const d1 = m1 - m0;
  const d2 = m2 - m1;
  const d3 = m3 - m2;
  return d3 > 0 && d3 < d2 && d2 < d1;
}
function consecutiveRise(a) {
  const opts = {
    daysRange: [6, 6],
    maxDailyGain: 3,
    minScore: 30,
    maMode: "none",
    requireExpandingBody: false,
    maxPullbackDays: 1,
    pullbackGainFloor: -0.5,
    maxGainStdDev: 8 * 0.2
  };
  const close = a.close;
  const n = close.length;
  if (n < 10)
    return null;
  const [minDays, maxDays] = opts.daysRange;
  const pullbackFloor = opts.pullbackGainFloor ?? -0.5;
  const maxPullback = opts.maxPullbackDays ?? (minDays >= 6 ? 1 : 0);
  const lenient = maxPullback >= 1;
  const maxGainStd = opts.maxGainStdDev ?? opts.maxDailyGain * 0.4;
  let maxBackDays = 0;
  let pullbackUsed = 0;
  for (let i = n - 1;i >= 1; i--) {
    const g = (close[i] - close[i - 1]) / close[i - 1] * 100;
    if (g > 0) {
      maxBackDays++;
    } else if (i < n - 1 && maxPullback > 0 && pullbackUsed < maxPullback && g >= pullbackFloor) {
      maxBackDays++;
      pullbackUsed++;
    } else {
      break;
    }
  }
  const requireYang = opts.requireYang ?? true;
  const maMode = opts.maMode ?? "strict";
  const candidateUpper = Math.min(maxBackDays, maxDays);
  for (let days = candidateUpper;days >= minDays; days--) {
    const start = n - days;
    let valid = true;
    const pullbackIdx = new Set;
    for (let i = start;i < n; i++) {
      const gainPct = (close[i] - close[i - 1]) / close[i - 1] * 100;
      if (gainPct > opts.maxDailyGain) {
        valid = false;
        break;
      }
      if (gainPct <= 0) {
        if (i === n - 1 || maxPullback <= 0 || gainPct < pullbackFloor) {
          valid = false;
          break;
        }
        pullbackIdx.add(i);
        continue;
      }
      if (!lenient) {
        if (requireYang && a.klines[i].close <= a.klines[i].open) {
          valid = false;
          break;
        }
        if (i > start && a.klines[i].open <= a.klines[i - 1].open) {
          valid = false;
          break;
        }
      }
    }
    if (!valid || pullbackIdx.size > maxPullback)
      continue;
    {
      let sum = 0;
      const gains2 = [];
      for (let i = start;i < n; i++) {
        const g = (close[i] - close[i - 1]) / close[i - 1] * 100;
        gains2.push(g);
        sum += g;
      }
      const mean = sum / gains2.length;
      let varSum2 = 0;
      for (const g of gains2)
        varSum2 += (g - mean) ** 2;
      const stdDev2 = Math.sqrt(varSum2 / gains2.length);
      if (stdDev2 > maxGainStd)
        continue;
    }
    const lastK = a.klines[n - 1];
    const lastBody = Math.abs(lastK.close - lastK.open);
    const lastUpperShadow = lastK.high - Math.max(lastK.close, lastK.open);
    if (Math.round(lastUpperShadow * 100) > Math.round(lastBody * 100))
      continue;
    const biasMa20 = a.ma20[n - 1];
    if (biasMa20 != null) {
      const bias20 = (close[n - 1] - biasMa20) / biasMa20 * 100;
      if (bias20 > (opts.maxBias20 ?? 12))
        continue;
    }
    if (opts.requireExpandingBody) {
      let prevBody = 0;
      for (let i = start;i < n; i++) {
        if (pullbackIdx.has(i))
          continue;
        const body = a.klines[i].close - a.klines[i].open;
        if (body <= prevBody) {
          valid = false;
          break;
        }
        prevBody = body;
      }
      if (!valid)
        continue;
    }
    if (!lenient) {
      for (let i = start + 1;i < n; i++) {
        if ((a.macd_macd[i] ?? 0) <= (a.macd_macd[i - 1] ?? 0)) {
          valid = false;
          break;
        }
      }
      if (!valid)
        continue;
    }
    if (maMode === "ma20Only") {
      if (!lenient) {
        for (let i = start + 1;i < n; i++) {
          if ((a.ma20[i] ?? 0) <= (a.ma20[i - 1] ?? 0)) {
            valid = false;
            break;
          }
        }
        if (!valid)
          continue;
      }
    } else if (maMode === "ma5Only") {
      if (!lenient) {
        for (let i = start + 1;i < n; i++) {
          if ((a.ma5[i] ?? 0) <= (a.ma5[i - 1] ?? 0)) {
            valid = false;
            break;
          }
        }
        if (!valid)
          continue;
      }
    } else if (maMode === "ma10Only") {
      if (!lenient) {
        for (let i = start + 1;i < n; i++) {
          if ((a.ma10[i] ?? 0) <= (a.ma10[i - 1] ?? 0)) {
            valid = false;
            break;
          }
        }
        if (!valid)
          continue;
      }
    } else if (maMode === "none") {} else {
      if (opts.requireNoMaCross ?? true) {
        if (!noMaCross(a, start, n - 1))
          continue;
      }
    }
    {
      let aboveCount = 0;
      for (let i = start;i < n; i++) {
        const m5 = a.ma5[i];
        const m10 = a.ma10[i];
        const m20 = a.ma20[i];
        if (m5 == null || m10 == null || m20 == null)
          continue;
        if (m5 >= m10 || m5 >= m20)
          aboveCount++;
      }
      if (aboveCount < 2)
        continue;
    }
    const lastMa5 = a.ma5[n - 1];
    const lastMa10 = a.ma10[n - 1];
    const lastMa20 = a.ma20[n - 1];
    if (lastMa5 <= lastMa10 || lastMa5 <= lastMa20)
      continue;
    if (lastK.low > lastMa5)
      continue;
    if (isArcTop(a))
      continue;
    let score = 0;
    const latestDif = lastOpt(a.macd_dif) ?? 0;
    if (days >= 5)
      score += 50;
    else if (days >= 4)
      score += 40;
    else
      score += 30;
    let sumGain = 0;
    const gains = [];
    for (let i = start;i < n; i++) {
      const g = (close[i] - close[i - 1]) / close[i - 1] * 100;
      sumGain += g;
      gains.push(g);
    }
    const avgGain = sumGain / gains.length;
    let varSum = 0;
    for (const g of gains)
      varSum += (g - avgGain) ** 2;
    const stdDev = Math.sqrt(varSum / gains.length);
    if (stdDev < 0.3)
      score += 20;
    else if (stdDev < 0.6)
      score += 10;
    if (latestDif > 1)
      score += 15;
    else if (latestDif > 0.5)
      score += 10;
    else
      score += 5;
    const ma5Start = ma5(a, start);
    const ma5End = ma5(a, n - 1);
    if (ma5Start > 0.0000000001) {
      const ma5Slope = (ma5End - ma5Start) / ma5Start;
      if (ma5Slope > 0.03)
        score += 15;
      else if (ma5Slope > 0.015)
        score += 10;
      else
        score += 5;
    }
    const finalScore = Math.max(0, Math.min(100, score));
    if (finalScore < opts.minScore)
      continue;
    let totalGain = 0;
    for (let i = start;i < n; i++) {
      totalGain += (close[i] - close[i - 1]) / close[i - 1] * 100;
    }
    return true;
  }
  return null;
}

// ../scan/patterns/volumeSurge.ts
var shortPeriod = 5;
var longPeriod = 40;
var minRatio = 1.5;
var TREND_NEAR_HIGH_RATIO = 0.9;
var MIN_TREND_SCORE = 3;
function calcTrendScore(klines) {
  const closes = klines.map((k) => k.close);
  const ma20Arr = sma(closes, 20);
  const ma60Arr = sma(closes, 60);
  const { bar: macdBars } = calcMacd(closes);
  const lastClose = closes[closes.length - 1];
  const lastMa20 = ma20Arr[ma20Arr.length - 1];
  const lastMa60 = ma60Arr[ma60Arr.length - 1];
  const lastMacdBar = macdBars[macdBars.length - 1];
  let score = 0;
  if (lastMa20 !== null && lastClose > lastMa20)
    score += 1;
  if (lastMa60 !== null && lastClose > lastMa60)
    score += 1;
  if (lastMa20 !== null && lastMa60 !== null && lastMa20 > lastMa60)
    score += 1;
  if (lastMacdBar > 0)
    score += 1;
  const recentHigh = Math.max(...closes.slice(-60));
  if (lastClose >= recentHigh * TREND_NEAR_HIGH_RATIO)
    score += 1;
  return score;
}
function volumeSurge(analysis, turnoverRate, pe, priceChange) {
  const { klines } = analysis;
  if (klines.length < longPeriod + 1)
    return null;
  if (turnoverRate < 1 || turnoverRate > 10)
    return null;
  if (pe <= 0)
    return null;
  if (priceChange < -5 || priceChange > 7)
    return null;
  const closes = klines.map((k) => k.close);
  const vols = klines.map((k) => k.vol);
  const lastBar = klines[klines.length - 1];
  const avgShort = vols.slice(-shortPeriod).reduce((a, b) => a + b, 0) / shortPeriod;
  const avgLong = vols.slice(-longPeriod).reduce((a, b) => a + b, 0) / longPeriod;
  if (avgLong <= 0)
    return null;
  const ratio = avgShort / avgLong;
  if (ratio < minRatio)
    return null;
  const trendScore = calcTrendScore(klines);
  if (trendScore < MIN_TREND_SCORE)
    return null;
  const ma20 = sma(closes, 20);
  const lastMa20 = ma20[ma20.length - 1];
  const prevMa20 = ma20[ma20.length - 2];
  const lastClose = closes[closes.length - 1];
  if (lastMa20 === null || prevMa20 === null || lastMa20 <= prevMa20 || lastClose <= lastMa20)
    return null;
  const { macd } = calcMacd(closes);
  const lastMacd = macd[macd.length - 1];
  const prevMacd = macd[macd.length - 2];
  if (lastMacd < prevMacd || lastMacd <= 0)
    return null;
  return true;
}

// ../scan/patterns/limitUpContinuation.ts
function limitUpThreshold2(code) {
  if (code.startsWith("30") || code.startsWith("688"))
    return 0.195;
  return 0.095;
}
function limitUpContinuation(code, klines) {
  if (klines.length < 30)
    return null;
  const last = klines[klines.length - 1];
  const prev = klines[klines.length - 2];
  if (prev.close <= 0)
    return null;
  const threshold = limitUpThreshold2(code);
  const pct = (last.close - prev.close) / prev.close;
  if (pct < threshold)
    return null;
  const sealed = last.close === last.high;
  if (!sealed)
    return null;
  const oneWord = last.open === last.close && last.close === last.high;
  let boards = 1;
  for (let j = klines.length - 2;j >= 1; j--) {
    const p = klines[j - 1].close;
    if (p > 0 && (klines[j].close - p) / p >= threshold)
      boards++;
    else
      break;
  }
  if (boards > 6)
    return null;
  return true;
}

// ../scan/scanOne.ts
function scanOne(type, code, name, dataDir, rebackNum) {
  try {
    const filePath = join(dataDir, `${code}.json`);
    const { analysis, turnoverRate, pe, priceChange } = loadAndAnalyze(filePath, name, rebackNum);
    const { klines } = analysis;
    const barIdx = klines.length - 1;
    const bar = klines[barIdx];
    const pattern = [];
    if (pe > 120)
      return null;
    if (maAlignedUpSmallGain(analysis, turnoverRate, pe) === true) {
      pattern.push("up_small_gain");
    }
    if (lastLowBreakoutBuy(analysis, pe) === true) {
      pattern.push("buy_signal");
    }
    if (longShadow(code, analysis, pe) === true) {
      pattern.push("long_shadow");
    }
    if (ma5ReversalCross(analysis) === true) {
      pattern.push("ma5_reversal_cross");
    }
    if (consecutiveRise(analysis) === true) {
      pattern.push("consecutive_rise");
    }
    if (volumeSurge(analysis, turnoverRate, pe, priceChange) === true) {
      pattern.push("volume_surge");
    }
    if (limitUpContinuation(code, klines) === true) {
      pattern.push("one_word_up");
    }
    if (pattern.length === 0)
      return null;
    return {
      type,
      code,
      name,
      pattern: pattern.join(","),
      lastDate: bar.date
    };
  } catch (_) {
    return null;
  }
}

// scanWorker.ts
var PROGRESS_INTERVAL = 50;
self.onmessage = (e) => {
  const { stocks, dataDir, rebackNum } = e.data;
  const results = [];
  const total = stocks.length;
  for (let i = 0;i < total; i++) {
    const { type, code, name } = stocks[i];
    try {
      const r = scanOne(type, code, name, dataDir, rebackNum);
      if (r)
        results.push(r);
    } catch {}
    if ((i + 1) % PROGRESS_INTERVAL === 0 || i === total - 1) {
      self.postMessage({ type: "progress", completed: i + 1, total });
    }
  }
  self.postMessage({ type: "done", results });
};
