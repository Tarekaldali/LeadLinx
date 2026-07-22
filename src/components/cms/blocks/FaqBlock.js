'use client';
export default function FaqBlock({ content, onChange }) {
  // content is expected to be an array of { question, answer }
  const faqs = Array.isArray(content) ? content : [{ question: 'Question 1', answer: 'Answer 1' }];

  const updateItem = (index, key, value) => {
    const newFaqs = [...faqs];
    newFaqs[index][key] = value;
    onChange(newFaqs);
  };

  const addItem = () => {
    onChange([...faqs, { question: '', answer: '' }]);
  };

  const removeItem = (index) => {
    if (faqs.length === 1) return;
    const newFaqs = [...faqs];
    newFaqs.splice(index, 1);
    onChange(newFaqs);
  };

  return (
    <div className="w-full border border-[#EEEEEE] rounded-xl bg-surface-container-lowest overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-surface-container-low border-b border-[#EEEEEE] flex items-center justify-between">
        <span className="text-[11px] text-secondary uppercase tracking-widest font-semibold">FAQ Block</span>
        <button 
          type="button"
          onClick={addItem}
          className="text-primary hover:text-primary/70 font-semibold text-sm flex items-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span> Add Item
        </button>
      </div>
      
      <div className="flex flex-col gap-4 p-4">
        {faqs.map((faq, index) => (
          <div key={index} className="relative group bg-surface border border-[#EEEEEE] rounded-xl p-4 transition-all focus-within:border-primary/50">
            {faqs.length > 1 && (
              <button 
                type="button"
                onClick={() => removeItem(index)}
                className="absolute -top-3 -right-3 w-7 h-7 bg-white border border-[#EEEEEE] rounded-full text-secondary hover:text-error hover:border-error flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                title="Remove Item"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] text-secondary mb-1.5 uppercase tracking-widest font-semibold">Question</label>
                <input 
                  type="text" 
                  placeholder="e.g. What is LeadLinx?"
                  className="w-full bg-surface border border-[#EEEEEE] rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-on-surface font-semibold" 
                  value={faq.question}
                  onChange={(e) => updateItem(index, 'question', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] text-secondary mb-1.5 uppercase tracking-widest font-semibold">Answer</label>
                <textarea 
                  placeholder="Enter the answer here..."
                  className="w-full bg-surface border border-[#EEEEEE] rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-on-surface resize-y min-h-[80px]"
                  value={faq.answer}
                  onChange={(e) => updateItem(index, 'answer', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
