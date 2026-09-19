/* Ridge City — full game lives in the repo working copy.
   If you see this stub, pull latest or copy game.js from the local ridge-city folder.
*/
fetch('./game.full.js').then(r=>r.text()).then(eval).catch(err=>document.body.insertAdjacentHTML('beforeend','<pre style=color:#fff;padding:20px>Missing game.js engine</pre>'));
