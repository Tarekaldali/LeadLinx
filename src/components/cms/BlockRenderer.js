import Link from 'next/link';
import Image from 'next/image';

export default function BlockRenderer({ blocks }) {
  if (!blocks || !Array.isArray(blocks)) return null;

  return (
    <div className="space-y-6">
      {blocks.map((block) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <div 
                key={block.id} 
                className="prose prose-sm md:prose-base font-body-lg text-body-lg text-on-surface-variant leading-relaxed max-w-none prose-a:text-primary prose-a:no-underline hover:prose-a:underline mb-md"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            );
          
          case 'h2':
            return <h2 id={`h-${block.id}`} key={block.id} className="font-h2 text-h2 leading-tight text-on-surface mt-lg mb-sm">{block.content}</h2>;
          
          case 'h3':
            return <h3 key={block.id} className="font-h3 text-[24px] font-semibold leading-snug text-on-surface mt-8 mb-3">{block.content}</h3>;
          
          case 'h4':
            return <h4 key={block.id} className="font-h3 text-[20px] font-semibold leading-snug text-on-surface mt-6 mb-2">{block.content}</h4>;
          
          case 'image':
            return block.content?.url ? (
              <figure key={block.id} className="my-8">
                <div className="relative w-full rounded-2xl overflow-hidden bg-surface-container-low border border-[#EEEEEE]">
                  <img src={block.content.url} alt={block.content.alt || 'Blog image'} className="w-full h-auto object-cover max-h-[600px]" />
                </div>
                {block.content.caption && <figcaption className="text-center text-sm text-secondary mt-3">{block.content.caption}</figcaption>}
              </figure>
            ) : null;
          
          case 'faq':
            return (
              <div key={block.id} className="my-10 space-y-4">
                {Array.isArray(block.content) && block.content.map((faq, idx) => (
                  <details key={idx} className="group border border-[#EEEEEE] rounded-xl bg-surface-container-lowest overflow-hidden open:bg-surface-container-low transition-colors">
                    <summary className="flex items-center justify-between p-5 cursor-pointer list-none font-h3 text-[18px] font-semibold text-on-surface">
                      {faq.question}
                      <span className="material-symbols-outlined text-secondary group-open:-rotate-180 transition-transform">expand_more</span>
                    </summary>
                    <div className="px-5 pb-5 pt-0 text-on-surface-variant font-body-md leading-relaxed whitespace-pre-line">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            );
          
          case 'cta':
            return block.content ? (
              <div key={block.id} className="my-10 w-full bg-primary/5 border border-primary/20 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden text-center md:text-left">
                <div className="absolute top-0 left-0 w-2 h-full bg-primary"></div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-h3 text-[24px] font-bold text-on-surface">{block.content.title}</h3>
                  <p className="font-body-md text-secondary">{block.content.description}</p>
                </div>
                {block.content.buttonText && block.content.url && (
                  <Link href={block.content.url} className="shrink-0 bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-sm px-8 py-3 rounded-lg transition-colors shadow-sm font-semibold whitespace-nowrap">
                    {block.content.buttonText}
                  </Link>
                )}
              </div>
            ) : null;
          
          case 'html':
            return (
              <div 
                key={block.id} 
                className="my-8 w-full"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            );
            
          default:
            return null;
        }
      })}
    </div>
  );
}
