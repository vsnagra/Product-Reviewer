import { Page, GlobalSettings } from '../store';

export const generateFinalImagesForPage = async (
  page: Page, 
  globalSettings: GlobalSettings, 
  updatePage: (id: string, data: Partial<Page>) => void,
  setStatus: (isGenerating: boolean, percent: number, text: string) => void
) => {
    let selectedUrls: string[] = [];
    if (page.selectionSequence && page.selectionSequence.length > 0) {
      for (const key of page.selectionSequence) {
        if (selectedUrls.length >= 4) break;
        const url = (page as any)[key];
        if (url) selectedUrls.push(url);
      }
    } else {
      const candidates = [
        { url: page.imageUrl, selected: page.isSelectedPageImage },
        { url: page.imageUrlAngle1, selected: page.isSelectedAngle1 },
        { url: page.imageUrlAngle2, selected: page.isSelectedAngle2 },
        { url: page.imageUrlAngle3, selected: page.isSelectedAngle3 },
        { url: page.imageUrlCloseUp1, selected: page.isSelectedCloseUp1 },
        { url: page.imageUrlCloseUp2, selected: page.isSelectedCloseUp2 }
      ];

      selectedUrls = candidates
        .filter(c => c.selected && c.url)
        .map(c => c.url!)
        .slice(0, 4);
    }

    const finalBookBackImgUrl = page.bookBackImageUrl || globalSettings.defaultBookBackImageUrl;
    if (!finalBookBackImgUrl || selectedUrls.length === 0) return;

    setStatus(true, 50, "Generating final images...");

    try {
      // Load Book Back image once
      const bookBackImg = new Image();
      bookBackImg.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        bookBackImg.onload = resolve;
        bookBackImg.onerror = reject;
        bookBackImg.src = finalBookBackImgUrl!;
      });

      const generateForSource = async (sourceUrl: string) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");
        
        const primaryImg = new Image();
        primaryImg.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          primaryImg.onload = resolve;
          primaryImg.onerror = reject;
          primaryImg.src = sourceUrl;
        });

        // Set canvas size to Book Back image size
        canvas.width = bookBackImg.width;
        canvas.height = bookBackImg.height;

        // Draw Book Back image
        ctx.drawImage(bookBackImg, 0, 0, canvas.width, canvas.height);

        // Draw the primary image as a heavy blurred background covering the canvas
        ctx.filter = 'blur(60px)';
        ctx.drawImage(primaryImg, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none'; // Reset filter so subsequent drawings aren't blurred

        // Draw Primary image with clipping and offset
        const imgOffsetX = page.imageOffsetX ?? globalSettings.defaultImageOffsetX ?? 306;
        const imgOffsetY = page.imageOffsetY ?? globalSettings.defaultImageOffsetY ?? 210;
        const clipX1 = page.imageClipX1 ?? globalSettings.defaultImageClipX1 ?? 112;
        const clipX2 = page.imageClipX2 ?? globalSettings.defaultImageClipX2 ?? 112;
        const imageScale = page.imageScale ?? globalSettings.defaultImageScale ?? 0.97;

        const sourceX = clipX1;
        const sourceY = 0;
        const sourceWidth = Math.max(1, primaryImg.width - clipX1 - clipX2);
        const sourceHeight = primaryImg.height;

        const destX = imgOffsetX;
        const destY = imgOffsetY;
        const destWidth = sourceWidth * imageScale;
        const destHeight = sourceHeight * imageScale;

        ctx.drawImage(
          primaryImg,
          sourceX, sourceY, sourceWidth, sourceHeight,
          destX, destY, destWidth, destHeight
        );

        const finalPngOverlayUrl = page.pngOverlayUrl || globalSettings.defaultPngOverlayUrl;
        // Draw PNG Overlay if exists
        if (finalPngOverlayUrl) {
          const pngOverlayImg = new Image();
          pngOverlayImg.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            pngOverlayImg.onload = resolve;
            pngOverlayImg.onerror = reject;
            pngOverlayImg.src = finalPngOverlayUrl!;
          });
          ctx.drawImage(pngOverlayImg, 0, 0, canvas.width, canvas.height);
        }

        // Draw Text Overlay
        const targetText = page.optimizedText || page.text;
        if (targetText) {
          const fontSize = page.fontSize ?? globalSettings.defaultFontSize ?? 45;
          const fontFamily = page.fontFamily || globalSettings.defaultFontFamily || 'Times New Roman';
          ctx.font = `bold ${fontSize}px "${fontFamily}"`;
          ctx.fillStyle = "black";

          const textOffsetX = page.textOffsetX ?? globalSettings.defaultTextOffsetX ?? 1500;
          const textOffsetY = page.textOffsetY ?? globalSettings.defaultTextOffsetY ?? 400;
          const textWidth = page.textWidth ?? globalSettings.defaultTextWidth ?? 700;

          const maxWidth = textWidth;
          const words = targetText.split(' ');
          let line = '';
          let y = textOffsetY;
          const lineHeight = fontSize * 1.25;

          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
              ctx.fillText(line, textOffsetX, y);
              line = words[n] + ' ';
              y += lineHeight;
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, textOffsetX, y);
        }

        return canvas.toDataURL('image/png');
      };

      const finalImageUrls: (string | undefined)[] = [];
      for (let i = 0; i < selectedUrls.length; i++) {
        finalImageUrls.push(await generateForSource(selectedUrls[i]));
      }

      let finalPageVideoOverlayUrl: string | undefined = undefined;
      const templateToUse = page.pageVideoOverlayTemplateUrl || globalSettings.defaultPageVideoOverlayTemplateUrl;
      if (templateToUse) {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const templateImg = new Image();
            templateImg.crossOrigin = "anonymous";
            await new Promise((resolve, reject) => {
              templateImg.onload = resolve;
              templateImg.onerror = reject;
              templateImg.src = templateToUse!;
            });

            canvas.width = templateImg.width;
            canvas.height = templateImg.height;
            ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

            // Draw Text Overlay
            const targetText = page.optimizedText || page.text;
            if (targetText) {
              const fontSize = page.fontSize ?? globalSettings.defaultFontSize ?? 45;
              const fontFamily = page.fontFamily || globalSettings.defaultFontFamily || 'Times New Roman';
              ctx.font = `bold ${fontSize}px "${fontFamily}"`;
              ctx.fillStyle = "black";

              const textOffsetX = page.textOffsetX ?? globalSettings.defaultTextOffsetX ?? 1500;
              const textOffsetY = page.textOffsetY ?? globalSettings.defaultTextOffsetY ?? 400;
              const textWidth = page.textWidth ?? globalSettings.defaultTextWidth ?? 700;

              const maxWidth = textWidth;
              const words = targetText.split(' ');
              let line = '';
              let y = textOffsetY;
              const lineHeight = fontSize * 1.25;

              for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                  ctx.fillText(line, textOffsetX, y);
                  line = words[n] + ' ';
                  y += lineHeight;
                } else {
                  line = testLine;
                }
              }
              ctx.fillText(line, textOffsetX, y);
            }
            finalPageVideoOverlayUrl = canvas.toDataURL('image/png');
          }
        } catch (e) {
          console.error("Error generating page video overlay", e);
        }
      }

      const updates: any = { 
        finalImagesOutdated: false,
        finalPageImageUrl: finalImageUrls[0] || undefined,
        finalPageImageUrlAngle1: finalImageUrls[1] || undefined,
        finalPageImageUrlAngle2: finalImageUrls[2] || undefined,
        finalPageImageUrlAngle3: finalImageUrls[3] || undefined
      };
      if (finalPageVideoOverlayUrl) {
        updates.pageVideoOverlayUrl = finalPageVideoOverlayUrl;
      }
      updatePage(page.id, updates);
      
      setStatus(true, 100, "Final images generated successfully.");
    } catch (error) {
      console.error("Error generating final images:", error);
      setStatus(true, 0, "Failed to generate final images.");
    } finally {
      setTimeout(() => setStatus(false, 0, ""), 2000);
    }
};