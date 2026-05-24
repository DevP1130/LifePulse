import type { Transaction } from '../types'

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  transactions: Transaction[]
  limit?: number
}

export default function TransactionTable({ transactions, limit = 40 }: Props) {
  const rows = transactions.slice(0, limit)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pr-4">Date</th>
            <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pr-4">Merchant</th>
            <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pr-4">Category</th>
            <th className="pb-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(txn => (
            <tr
              key={txn.id}
              className={`group transition-colors ${txn.is_signal ? 'bg-accent/[0.03]' : ''} hover:bg-gray-50/80`}
            >
              <td className="py-2.5 pr-4 text-gray-500 text-xs tabular-nums whitespace-nowrap">
                {fmt(txn.date)}
              </td>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  {txn.is_signal && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" title="Relocation signal" />
                  )}
                  <span className={`${txn.is_signal ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                    {txn.merchant}
                  </span>
                </div>
              </td>
              <td className="py-2.5 pr-4 text-xs text-gray-400">{txn.category}</td>
              <td className={`py-2.5 text-right font-medium tabular-nums ${
                txn.transaction_type === 'credit' ? 'text-emerald-600' : 'text-gray-700'
              }`}>
                {txn.transaction_type === 'credit' ? '+' : ''}
                ${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
