# See You Tomorrow showcase website

An English, buildless static showcase for the local Windows app. The site plays
the owner's selected screen recording; it does not host Qwen or accept chats.
No accounts, analytics, third-party embeds, or microphone access are used here.

## Cloudflare Pages

- Repository: `zhhwang168/see-you-tomorrow`
- Production branch: `main`
- Root directory: leave at the repository root
- Framework preset: None
- Build command: leave empty
- Build output directory: `website`

The repository-root `wrangler.toml` pins the output directory to `./website`,
so Git-connected builds deploy the showcase rather than the local app HTML.
Treat this checked-in configuration as the source of truth.

Publish only this directory. The Node server and Python speech service belong
to the local app, not to the website deployment. All web assets are local files,
and the showcase MP4 is below Cloudflare Pages' 25 MiB per-file limit.

## Local preview

From the repository root, run `node preview.mjs`
and visit `http://127.0.0.1:8361/`.

## Updating the media

Replace `assets/showcase.mp4`, the matching WebVTT captions and poster. Update
chapter buttons in `index.html` to the new video's timestamps. Run
`node prepare-showcase.mjs` from the repository root to refresh the text
transcript after changing the caption file.

The portraits are the project's existing fictional Mira and Nora characters.
Inter is distributed with the included SIL Open Font License (`assets/OFL.txt`).
The video contains original recorded app dialogue, with no music or added SFX.
Its question labels are summaries; the replies are selected edited excerpts.

Future language practice and translation are clearly described as development
directions. The original recording includes imperfect model answers; the page
provides a short clarification and a NASA reference for the science example.
