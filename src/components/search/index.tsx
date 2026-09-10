import { Search as SearchIcon } from 'lucide-react'
type Props = {
  keyword: string
  setkeyword: (keyword: string) => void
  onSearch: () => void
}

const Search = ({ keyword, setkeyword, onSearch }: Props) => {
  return (
    <section className='flex-shrink-0 mb-2 flex items-stretch pr-[4px]'>
      <input
        className='flex-1 min-w-0 h-[32px] px-2 text-sm bg-white text-gray-700 placeholder:text-gray-400 border-none outline-none rounded-l-sm'
        placeholder='搜索ETF代码或名称'
        value={keyword}
        onChange={(e) => setkeyword(e.target.value)}
        onKeyUp={(e) => e.key === 'Enter' && onSearch()}
      />
      <button
        onClick={onSearch}
        className='flex-shrink-0 h-[32px] px-2.5 text-[12px] font-medium bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-r-sm cursor-pointer transition-colors select-none'
      >
        <SearchIcon size={16} />
      </button>
    </section>
  )
}

export default Search
