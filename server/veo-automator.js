const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// We default to undefined so Puppeteer can use its own unmanaged Chromium binary, bypassing corporate GPOs.
const CHROME_EXECUTABLE_PATH = undefined;

let browserInstance = null;

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function getBrowser(profilePath, executablePath) {
  if (browserInstance) return browserInstance;

  try {
    let userDataDir = path.join(__dirname, 'chrome-profile');
    if (profilePath && typeof profilePath === 'string' && profilePath.trim() !== '') {
        userDataDir = profilePath;
    }

    let args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--no-remote',
      '-profile',
      userDataDir
    ];

    browserInstance = await puppeteer.launch({
      browser: 'firefox',
      headless: false, // Must be visible for Google Labs or it will block us easily
      args: args,
      defaultViewport: null,
      dumpio: true
    });

    browserInstance.on('disconnected', () => {
      browserInstance = null;
    });

    return browserInstance;
  } catch (error) {
    console.error("Failed to launch Chrome:", error);
    throw new Error(`Could not launch Chrome. Details: ${error.message}`);
  }
}

app.post('/api/push-to-veo', async (req, res) => {
  const { pages, chromeProfilePath, chromeExecutablePath } = req.body;

  if (!pages || !Array.isArray(pages)) {
    return res.status(400).json({ error: "Invalid pages array" });
  }

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // flush the headers to establish SSE

  const sendEvent = (type, data) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent('trace', 'Received request to push to Veo Flow');

  // Create a temporary directory for images
  const uploadDir = path.join(os.tmpdir(), 'veo-uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  try {
    sendEvent('trace', 'Attempting to launch Chrome...');
    const browser = await getBrowser(chromeProfilePath, chromeExecutablePath);
    sendEvent('trace', 'Chrome launched successfully.');

    for (const page of pages) {
      const { pageId, chapterNumber, pageNumber, imageBase64, videoPrompt } = page;
      sendEvent('trace', `Processing Chapter ${chapterNumber} Page ${pageNumber}...`);

      if (!imageBase64 || !videoPrompt) {
        sendEvent('trace', `Skipping Chapter ${chapterNumber} Page ${pageNumber} due to missing image or prompt.`);
        continue;
      }

      // 1. Save Image to Disk
      sendEvent('trace', `Saving image to disk for Chapter ${chapterNumber} Page ${pageNumber}`);
      const fileName = `Chapter${chapterNumber}Page${pageNumber}.jpg`;
      const filePath = path.join(uploadDir, fileName);
      
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

      // 2. Open new tab and go to Flow
      sendEvent('trace', `Opening new tab and navigating to Veo Flow for Chapter ${chapterNumber} Page ${pageNumber}`);
      const pageTab = await browser.newPage();
      await pageTab.goto('https://labs.google/fx/tools/flow', { waitUntil: 'networkidle2' });

      try {
        // Wait for potential manual login on first run
        await pageTab.waitForFunction(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.some(b => (b.textContent || '').includes('New project') || (b.textContent || '').includes('+'));
        }, { timeout: 60000 }).catch(() => {});
        // 3. Click New Project
        sendEvent('trace', `Clicking New Project...`);
        const newProjectBtn = await pageTab.evaluateHandle(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.find(b => b.textContent.includes('New project') || b.textContent.includes('+'));
        });
        if (newProjectBtn) {
            await newProjectBtn.click();
        } else {
            sendEvent('trace', "Could not find New Project button. Proceeding assuming we are in editor.");
        }
        
        await wait(3000); // Wait for editor to load

        // Helper function for robust clicks
        async function clickButtonByText(text, exact = true) {
            const isFound = await pageTab.evaluate((text, exact) => {
                const btns = Array.from(document.querySelectorAll('button, [role="button"], [type="button"], [role="menuitem"], [role="option"]'));
                // Filter out obviously hidden elements
                const visibleBtns = btns.filter(b => b.offsetParent !== null || b.getBoundingClientRect().width > 0);
                const btn = visibleBtns.find(b => {
                    const t = (b.textContent || '').trim();
                    return exact ? t === text : t.includes(text);
                });
                
                if (btn) {
                    btn.scrollIntoView({ behavior: 'instant', block: 'center' });
                    // Dispatch a full React-compatible mouse event sequence
                    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                    btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                    btn.click();
                    return true;
                }
                return false;
            }, text, exact);
            
            if (!isFound) {
                sendEvent('trace', `Warning: Button with text "${text}" not found!`);
            }
            await wait(800);
        }

        // 4. Ensure Video Settings are Selected
        sendEvent('trace', `Configuring video generation settings...`);
        
        // Click the settings pill (usually "Video · 8s" or "Image ·")
        const isPillFound = await pageTab.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, [role="button"], [type="button"]'));
            const pill = btns.find(b => {
                const t = (b.textContent || '').trim();
                return (t.includes('Video') || t.includes('Image')) && t.includes('·');
            });
            if (pill) {
                pill.scrollIntoView({ behavior: 'instant', block: 'center' });
                pill.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                pill.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                pill.click();
                return true;
            }
            return false;
        });
        if (isPillFound) {
            await wait(1000);
        }

        // Configure options in the popover
        await clickButtonByText('Video', true);
        await clickButtonByText('Frames', true);
        await clickButtonByText('16:9', true);
        await clickButtonByText('1x', true);
        await clickButtonByText('Veo 3.1 - Lite (Lower Priority)', true);
        await clickButtonByText('8s', true);

        // Close popover
        await pageTab.keyboard.press('Escape');
        await wait(1000);

        // 5. Open the Start asset modal
        sendEvent('trace', `Opening Start asset modal...`);
        await pageTab.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
            const startBtn = btns.find(b => b.textContent.trim() === 'Start');
            if (startBtn) startBtn.click();
        });
        
        await wait(2000); // Wait for modal to open

        // 6. Upload the file to the library
        sendEvent('trace', `Uploading image media...`);
        const fileInput = await pageTab.$('input[type="file"]');
        if (fileInput) {
            await fileInput.uploadFile(filePath);
        } else {
            sendEvent('error', `Could not find file input for upload on page ${pageNumber}.`);
            continue;
        }

        // Wait for upload to complete and appear in gallery (poll for up to 60s)
        sendEvent('trace', 'Waiting for image upload to complete...');
        for (let i = 0; i < 30; i++) {
            await wait(2000);
            const uploaded = await pageTab.evaluate((fileName) => {
                const elements = Array.from(document.querySelectorAll('*'));
                const anyEls = elements.filter(el => (el.textContent || '').includes(fileName));
                return anyEls.length > 0;
            }, fileName);
            
            if (uploaded) {
                sendEvent('trace', `Image ${fileName} appeared in gallery!`);
                await wait(2000); // Give it a bit more time to fully render
                break;
            } else if (i % 3 === 0) {
                sendEvent('trace', `Still waiting for upload... (${(i+1)*2}s)`);
            }
        }
        
        // 6. Click Start frame
        sendEvent('trace', `Opening Start asset modal...`);
        const isStartFound = await pageTab.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, [role="button"], [type="button"]'));
            const btn = btns.find(b => (b.textContent || '').trim() === 'Start');
            if (btn) {
                btn.scrollIntoView({ behavior: 'instant', block: 'center' });
                btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                btn.click();
                return true;
            }
            return false;
        });
        
        if (isStartFound) {
            sendEvent('trace', `Start frame found. Performing robust in-page click...`);
        } else {
            sendEvent('error', `Start frame button not found!`);
        }

        await wait(1000);

        // 7. Select uploaded image and click "Add to Prompt"
        sendEvent('trace', `Selecting image in gallery and adding to prompt...`);
        const isImageFound = await pageTab.evaluate((fileName) => {
            const elements = Array.from(document.querySelectorAll('*'));
            const nameEls = elements.filter(el => (el.textContent || '').trim() === fileName);
            let nameEl = nameEls.length > 0 ? nameEls[nameEls.length - 1] : null;
            if (!nameEl) {
                const anyEls = elements.filter(el => (el.textContent || '').includes(fileName));
                nameEl = anyEls.length > 0 ? anyEls[anyEls.length - 1] : null;
            }

            if (nameEl) {
                const btn = nameEl.closest('button, [role="button"], [type="button"], [role="option"], [role="menuitem"], li') || nameEl.parentElement;
                btn.scrollIntoView({ behavior: 'instant', block: 'center' });
                btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                btn.click();
                return true;
            }
            return false;
        }, fileName);
        
        if (isImageFound) {
            sendEvent('trace', `Image found in gallery. Performing robust in-page click...`);
            await wait(500);
        } else {
            sendEvent('error', `Image ${fileName} not found in gallery!`);
        }

        await wait(2000); // Wait for selection UI to update and preview to load
        
        const isAddBtnFound = await pageTab.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('*'));
            const textEls = elements.filter(el => {
                const t = (el.textContent || '');
                return t === 'Add to Prompt' || t === 'Add to prompt';
            });
            let targetEl = textEls.length > 0 ? textEls[textEls.length - 1] : null;
            
            if (!targetEl) {
                const anyEls = elements.filter(el => {
                    const t = (el.textContent || '');
                    return t.includes('Add to Prompt') || t.includes('Add to prompt');
                });
                targetEl = anyEls.length > 0 ? anyEls[anyEls.length - 1] : null;
            }

            if (targetEl) {
                const btn = targetEl.closest('button, [role="button"], [type="button"]') || targetEl;
                btn.scrollIntoView({ behavior: 'instant', block: 'center' });
                btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                btn.click();
                return true;
            }
            return false;
        });
        
        if (isAddBtnFound) {
            sendEvent('trace', `Add to Prompt found. Performing robust in-page click...`);
            await wait(500);
        } else {
            sendEvent('trace', `Add to Prompt button not found! Dumping DOM...`);
            const html = await pageTab.content();
            require('fs').writeFileSync('server/dom_dump.txt', html);
        }

        // 7.5. Record the source URLs of all images/videos BEFORE submission
        const preSubmitSrcs = await pageTab.evaluate(() => {
            return Array.from(document.querySelectorAll('img, video')).map(el => el.src).filter(Boolean);
        });
        sendEvent('trace', `Recorded ${preSubmitSrcs.length} existing media items before generation.`);

        await wait(1000);

        // 8. Type Video Prompt
        sendEvent('trace', `Typing video prompt text...`);
        const textareaHandle = await pageTab.$('textarea, [contenteditable="true"]');
        if (textareaHandle) {
            await textareaHandle.focus();
            
            // Move cursor to the end of the text/contenteditable
            await pageTab.keyboard.press('End');
            await wait(200);
            
            // Type the prompt using simulated keystrokes
            await pageTab.keyboard.type(" " + videoPrompt, { delay: 10 });
            
            // Press space at the end to ensure React registers the final word
            await pageTab.keyboard.press(' ');
            await wait(500);
        } else {
            sendEvent('trace', "Could not find textarea to type prompt!");
        }

        await wait(2000); // Wait for React to process the prompt text and enable the Execute button

        // 9. Click right arrow (Execute) or Submit via Keyboard
        sendEvent('trace', `Submitting Veo prompt...`);
        
        if (textareaHandle) {
            await textareaHandle.focus();
            await pageTab.keyboard.down('Control');
            await pageTab.keyboard.press('Enter');
            await pageTab.keyboard.up('Control');
            await wait(500);
            
            // Fallback just Enter
            await pageTab.keyboard.press('Enter');
            await wait(1000);
        }

        // Try to click the button as a fallback just in case keyboard didn't work
        await pageTab.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, [role="button"], [type="button"]'));
            const btn = btns.find(b => {
                const text = (b.textContent || '').toLowerCase();
                return text.includes('create') || text.includes('arrow_forward');
            });
            
            if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
                btn.scrollIntoView({ behavior: 'instant', block: 'center' });
                btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                btn.click();
            }
        });
        
        await wait(1000);
        sendEvent('trace', `Prompt submitted successfully!`);
            
            // Wait for generation to complete and trigger 4K download
            sendEvent('trace', 'Waiting for video generation to complete via Menu Polling (this may take 3-5 minutes)...');
            let videoDownloaded = false;
            let attempts = 0;
            const maxAttempts = 50; // Up to 12.5 minutes (50 * 15s)
            
            while (!videoDownloaded && attempts < maxAttempts) {
                attempts++;
                await wait(15000); // Wait 15 seconds between checks as requested
                
                sendEvent('ping', `Checking generation status via right-click... (Attempt ${attempts}/${maxAttempts})`);
                
                // Find coordinates of the top-left media card
                const coords = await pageTab.evaluate(() => {
                    const mediaItems = Array.from(document.querySelectorAll('video, img')).filter(el => {
                        const rect = el.getBoundingClientRect();
                        return rect.width > 150 && rect.height > 100 && rect.top > 50 && rect.left > 50;
                    });
                    
                    if (mediaItems.length === 0) return null;
                    
                    mediaItems.sort((a, b) => {
                        const rectA = a.getBoundingClientRect();
                        const rectB = b.getBoundingClientRect();
                        if (Math.abs(rectA.top - rectB.top) > 50) return rectA.top - rectB.top;
                        return rectA.left - rectB.left;
                    });
                    
                    const targetMedia = mediaItems[0];
                    targetMedia.scrollIntoView({ behavior: 'instant', block: 'center' });
                    const rect = targetMedia.getBoundingClientRect();
                    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                });
                
                if (!coords) {
                    sendEvent('trace', `Could not find a media card. Skipping check...`);
                    continue;
                }
                
                sendEvent('trace', `Right-clicking media card to check if it has finished generating...`);
                await pageTab.mouse.click(coords.x, coords.y, { button: 'right' });
                await wait(1500); 
                    
                    let downloadFound = false;
                    for (let i = 0; i < 15; i++) {
                        await pageTab.keyboard.press('ArrowDown');
                        await wait(150);
                        const isDownload = await pageTab.evaluate(() => {
                            if (!document.activeElement) return false;
                            const text = (document.activeElement.textContent || '').toLowerCase();
                            return text.includes('download');
                        });
                        if (isDownload) {
                            downloadFound = true;
                            break;
                        }
                    }

                    if (downloadFound) {
                        // Open the submenu
                        await pageTab.keyboard.press('ArrowRight');
                        await wait(1000); // Wait for submenu

                        let fourKFound = false;
                        for (let i = 0; i < 10; i++) {
                            await pageTab.keyboard.press('ArrowDown');
                            await wait(150);
                            const is4k = await pageTab.evaluate(() => {
                                if (!document.activeElement) return false;
                                const text = (document.activeElement.textContent || '').toLowerCase();
                                return text.includes('4k') && text.includes('upscaled');
                            });
                            if (is4k) {
                                fourKFound = true;
                                break;
                            }
                        }

                        if (fourKFound) {
                            sendEvent('trace', `Successfully navigated to 4K Download via Keyboard!`);
                            
                            // 1. Snapshot the Downloads directory BEFORE clicking
                            const downloadsDir = path.join(os.homedir(), 'Downloads');
                            const initialFiles = fs.existsSync(downloadsDir) ? fs.readdirSync(downloadsDir).filter(f => f.endsWith('.mp4')) : [];

                            await pageTab.keyboard.press('Enter'); // Trigger the 4K download!
                            
                            // 2. Wait for the download to finish
                            sendEvent('trace', `Waiting for 4K video to finish downloading to your Downloads folder...`);

                            let newFile = null;
                            for (let j = 0; j < 300; j++) {
                                await wait(2000);
                                if (!fs.existsSync(downloadsDir)) continue;
                                const currentFiles = fs.readdirSync(downloadsDir).filter(f => f.endsWith('.mp4'));
                                newFile = currentFiles.find(f => !initialFiles.includes(f));
                                if (newFile) {
                                    // Found a new .mp4. Wait until its size stabilizes (no longer downloading)
                                    const filePath = path.join(downloadsDir, newFile);
                                    let size1 = 0;
                                    try { size1 = fs.statSync(filePath).size; } catch(e) {}
                                    await wait(1000);
                                    let size2 = 0;
                                    try { size2 = fs.statSync(filePath).size; } catch(e) {}
                                    
                                    if (size1 === size2 && size1 > 0) {
                                        break; // File is stable!
                                    } else {
                                        newFile = null; // Still downloading
                                    }
                                }
                            }

                            if (newFile) {
                                sendEvent('trace', `Downloaded video found: ${newFile}. Attaching to Page...`);
                                const sourcePath = path.join(downloadsDir, newFile);
                                const destDir = path.join(__dirname, '..', 'public', 'downloads');
                                if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                                const destPath = path.join(destDir, newFile);
                                fs.copyFileSync(sourcePath, destPath);
                                
                                const videoUrl = `http://localhost:3005/downloads/${newFile}`;
                                sendEvent('video_downloaded', { pageId, url: videoUrl });
                                videoDownloaded = true;
                            } else {
                                sendEvent('trace', `Timed out waiting for 4K video download to complete in Downloads folder.`);
                                videoDownloaded = true; // Break the outer loop anyway
                            }
                            break;
                        }
                    }
                    
                    // If we didn't find it (maybe generation still running), close the menu
                    await pageTab.keyboard.press('Escape');
                    await wait(200);
                    await pageTab.keyboard.press('Escape');
                }
            
            if (!videoDownloaded) {
                sendEvent('error', `Timed out waiting for video to generate and download.`);
            }

        sendEvent('trace', `Successfully queued Chapter ${chapterNumber} Page ${pageNumber}`);

      } catch (err) {
        sendEvent('error', `Error automating page ${pageNumber}: ${err.message}`);
      }
    }
    
    sendEvent('trace', 'Veo automation fully completed.');
    res.end();
  } catch (error) {
    sendEvent('error', `Fatal error during Veo Flow Automation: ${error.message}`);
    res.end();
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Veo Automator Server running on port ${PORT}`);
});
