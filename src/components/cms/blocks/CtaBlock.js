'use client';
export default function CtaBlock({ content, onChange }) {
  // content is expected to be { title, description, buttonText, url }
  const data = content || { title: '', description: '', buttonText: '', url: '' };

  const update = (key, value) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="w-full bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-2 h-full bg-primary"></div>
      
      <div className="flex-1 w-full space-y-2">
        <input 
          type="text" 
          placeholder="CTA Title"
          className="w-full bg-transparent border-none outline-none font-h3 text-[24px] text-on-surface focus:ring-0 p-0 font-bold" 
          value={data.title}
          onChange={(e) => update('title', e.target.value)}
        />
        <textarea 
          placeholder="CTA Description..."
          className="w-full bg-transparent border-none outline-none font-body-md text-secondary focus:ring-0 p-0 resize-none h-[48px]"
          value={data.description}
          onChange={(e) => update('description', e.target.value)}
        />
      </div>
      
      <div className="flex-shrink-0 w-full md:w-auto flex flex-col gap-2">
        <input 
          type="text" 
          placeholder="Button Text"
          className="w-full text-center bg-primary text-on-primary placeholder:text-on-primary/70 font-label-sm px-6 py-3 rounded-lg transition-colors shadow-sm outline-none border border-transparent focus:border-on-primary/50" 
          value={data.buttonText}
          onChange={(e) => update('buttonText', e.target.value)}
        />
        <input 
          type="text" 
          placeholder="URL (e.g. /login)"
          className="w-full text-center bg-surface-container-lowest border border-[#EEEEEE] text-on-surface font-body-md text-sm px-3 py-1.5 rounded outline-none focus:border-primary" 
          value={data.url}
          onChange={(e) => update('url', e.target.value)}
        />
      </div>
    </div>
  );
}
