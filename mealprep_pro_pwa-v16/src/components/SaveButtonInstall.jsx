import { useEffect, useRef, useState } from 'react';
import { BookmarkPlus, ChevronDown, ChevronUp, Laptop } from 'lucide-react';

// Built from the readable source; see the note in the handoff.
const BOOKMARKLET_CODE = "(function(){var y=\"https://www.mealplanner.cloud/app/recipes/new\";function v(r){var e=r&&r[\"@type\"];if(!e)return!1;e=[].concat(e);for(var n=0;n<e.length;n++)if(String(e[n]).toLowerCase()===\"recipe\")return!0;return!1}function o(r,e){if(!r||e>6)return null;if(Array.isArray(r)){for(var n=0;n<r.length;n++){var g=o(r[n],e+1);if(g)return g}return null}if(typeof r!=\"object\")return null;if(v(r))return r;if(r[\"@graph\"])return o(r[\"@graph\"],e+1);for(var h in r)if(h.charAt(0)!==\"@\"){var m=o(r[h],e+1);if(m)return m}return null}function f(r,e){if(!r)return e;if(typeof r==\"string\")return e.push(r),e;if(Array.isArray(r)){for(var n=0;n<r.length;n++)f(r[n],e);return e}if(typeof r==\"object\"){if(r.itemListElement)return f(r.itemListElement,e);if(r.text)return f(r.text,e);if(r.name)return f(r.name,e)}return e}function c(r){return r?typeof r==\"string\"?r:Array.isArray(r)?c(r[0]):r.url?c(r.url):\"\":\"\"}for(var t=null,p=document.querySelectorAll('script[type=\"application/ld+json\"]'),l=0;l<p.length&&!t;l++)try{t=o(JSON.parse(p[l].textContent),0)}catch(r){}var i={u:location.href.split(\"#\")[0]};if(t){i.n=t.name,i.y=t.recipeYield,i.i=[].concat(t.recipeIngredient||t.ingredients||[]),i.s=f(t.recipeInstructions,[]),i.m=c(t.image),i.pt=t.prepTime,i.ct=t.cookTime;var a=t.nutrition;a&&typeof a==\"object\"&&(i.nu={c:a.calories,p:a.proteinContent,cb:a.carbohydrateContent,f:a.fatContent})}else{var u=String(window.getSelection()||\"\").trim();if(!u){alert(`MealPrep Pro couldn't find a recipe on this page.\n\nHighlight the recipe text, then click the button again.`);return}i.n=document.title,i.t=u}var s=y+\"#mpp=\"+encodeURIComponent(JSON.stringify(i)),d=window.open(s,\"_blank\");d||(location.href=s)})();";

export default function SaveButtonInstall() {
  const [open, setOpen] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const linkRef = useRef(null);

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  // React warns on javascript: hrefs written in JSX, so set it directly
  useEffect(() => {
    if (open && linkRef.current) {
      linkRef.current.setAttribute('href', 'javascript:' + encodeURIComponent(BOOKMARKLET_CODE));
    }
  }, [open]);

  return (
    <div className="mt-3 pt-3 border-t border-green-200/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-800"
      >
        <BookmarkPlus size={14} />
        Site won't import? Get the Save button for your browser
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="mt-3 text-xs text-gray-600 space-y-3">
          {isTouch ? (
            <p className="flex items-start gap-2 bg-white rounded-xl p-3 border border-gray-200">
              <Laptop size={16} className="text-gray-400 shrink-0 mt-0.5" />
              <span>
                The Save button works best on a computer. On your phone, copy the recipe
                text and use <strong>Paste recipe text</strong> below.
              </span>
            </p>
          ) : (
            <>
              <p>
                Drag this button up to your bookmarks bar. Then, whenever you're looking at a
                recipe, click it — it works even on sites that block importing.
              </p>
              <div className="flex justify-center py-1">
                <a
                  ref={linkRef}
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Drag this button to your bookmarks bar instead of clicking it here.');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white font-semibold text-sm shadow-sm cursor-grab active:cursor-grabbing select-none"
                  title="Drag me to your bookmarks bar"
                >
                  <BookmarkPlus size={16} />
                  Save to MealPrep Pro
                </a>
              </div>
              <p className="text-gray-400">
                Don't see a bookmarks bar? Press Ctrl+Shift+B (Windows) or Cmd+Shift+B (Mac).
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
