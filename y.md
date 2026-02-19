PS C:\Users\KAZUYUKI G\Desktop\system\react\gia-next> npm run remotion:render

> gia-next@0.1.0 remotion:render
> npx remotion render remotion/index.ts GiaStoriesIntro out/gia-stories.mp4

-------------
Version mismatch:
Extra packages with wrong versions:
  - zod: installed 4.3.5, required 3.22.3
    See: https://www.remotion.dev/docs/schemas#prerequisites

You may experience breakages such as:
- React context and hooks not working
- Type errors and feature incompatibilities
- Failed renders and unclear errors

To resolve:
- Make sure your package.json has all Remotion packages pointing to the same version.
- Remove the `^` character in front of a version to pin a package.
- For zod, install exact version 3.22.3 (run: npx remotion add zod).
- Run `npx remotion versions --log=verbose` to see the path of the modules resolved.
-------------

Downloading Chrome Headless Shell https://www.remotion.dev/chrome-headless-shell
Downloading from: https://storage.googleapis.com/chrome-for-testing-public/144.0.7559.20/win64/chrome-headless-shell-win64.zip
Got Headless Shell   ━━━━━━━━━━━━━━━━━━ 10149ms

Error: You passed C:\Users\KAZUYUKI G\Desktop\system\react\gia-next\remotion\index.ts as your entry point, but this file does not contain "registerRoot". You should use the file that calls registerRoot() as the entry point. To ignore this error, pass "ignoreRegisterRootWarning" to bundle(). This error cannot be ignored on the CLI.
    at validateEntryPoint (C:\Users\KAZUYUKI G\Desktop\system\react\gia-next\node_modules\@remotion\bundler\dist\bundle.js:132:15)
    at async Object.internalBundle (C:\Users\KAZUYUKI G\Desktop\system\react\gia-next\node_modules\@remotion\bundler\dist\bundle.js:146:9)
    at async bundleOnCli (C:\Users\KAZUYUKI G\Desktop\system\react\gia-next\node_modules\@remotion\cli\dist\setup-cache.js:146:21)
    at async bundleOnCliOrTakeServeUrl (C:\Users\KAZUYUKI G\Desktop\system\react\gia-next\node_modules\@remotion\cli\dist\setup-cache.js:35:21)
    at async renderVideoFlow (C:\Users\KAZUYUKI G\Desktop\system\react\gia-next\node_modules\@remotion\cli\dist\render-flows\render.js:162:53)
    at async render (C:\Users\KAZUYUKI G\Desktop\system\react\gia-next\node_modules\@remotion\cli\dist\render.js:145:5)
    at async cli (C:\Users\KAZUYUKI G\Desktop\system\react\gia-next\node_modules\@remotion\cli\dist\index.js:92:13)  
PS C:\Users\KAZUYUKI G\Desktop\system\react\gia-next> 