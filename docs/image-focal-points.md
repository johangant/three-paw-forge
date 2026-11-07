# Work image framing review

Reviewed all 33 work/WIP photographs against the 4:3 centre crops, including the work index covers and homepage features. The original photographs are unchanged, and the lightbox still shows the full photograph.

## Changes made

All thumbnail frames remain 4:3. Eighteen photographs now use `fit: contain` to keep the entire photographed object visible, with neutral space around portrait images:

- Bell and hanger: `work/bells/IMG_2477`.
- Painted frogs: `work/frogs/IMG_1055` and `IMG_7958` (keep eyes and feet).
- Both handles and both hooks in `work/hooks/IMG_9589`.
- Horseshoe Christmas tree (keep the star and base).
- Curved metal experiment: `work/misc/IMG_1067`.
- Ouroboros drawing (keep the complete circular outline).
- All three spoon photographs (keep bowl and handle ends, or the whole presentation box).
- All five wine-rack photographs (keep the rack and its supports).
- WIP spider (keep the legs).

The bell on the forming tool, `work/bells/IMG_2474`, keeps a filled frame with `focalPoint: "50% 35%"` to favour the bell. Other centre crops retain the visible object or useful detail and are unchanged. Project cover cards and homepage features inherit the photograph’s settings.

## Two images for your judgement

| Image | Remaining question | How to direct the framing |
| --- | --- | --- |
| `work/hooks/scrollwork` | The source photograph already cuts off the long bar at the left edge. The loop and scrolls are visible, so the existing detail view is retained. No crop setting can reveal the missing end. | Confirm that this should remain a detail photograph, or supply a wider photograph to show the complete piece. You can say “keep the loop and all three curls visible”. |
| `work/misc/IMG_7297` | Two heated shapes are visible inside the forge. The centre crop is retained because I cannot confidently choose which detail you want to emphasise. | Say “the large lower ring”, “the small looped shape above”, or “keep both”. A marked screenshot is also enough. Use `fit: contain` if you want the full source frame rather than a detail crop. |

Neither image blocks the build. Their present crops remain usable; the choices above are about the intended emphasis.

## Set framing yourself

In the relevant `src/pieces/<project>.md` gallery entry:

```yaml
  - image: work/bells/IMG_2474
    alt: Copper-coloured bell on a metal forming tool
    caption: The bell taking shape.
    fit: cover
    focalPoint: "50% 35%"
```

- `fit: cover` fills the 4:3 frame, cropping where needed. This is the default.
- `fit: contain` shows the entire source photograph inside the same frame.
- `focalPoint` controls horizontal and vertical alignment: `0%` is left/top, `50%` is centre, and `100%` is right/bottom. It adjusts framing; it is not a change to the original photograph. Use it primarily with `cover`.

For WIP, put those same fields in `src/_data/currentWork.json`, under the image ID. For a homepage-only override, add `fit` and/or `focalPoint` to the selected entry in `src/_data/featuredWork.json`; gallery framing stays unchanged.

To ask for an adjustment, provide the image ID (or source filename and project), where it is used (gallery, work index or homepage), and what must stay visible. For example: “spoons/IMG_8629, homepage: show the whole spoon including the tip” or “bells/IMG_2474: centre on the bell, not the forming tool”. You can also send a screenshot with the intended subject circled or the desired crop outlined. No image conversion is needed after changing these settings: rebuild or use the development preview.
