const formData = new FormData();
formData.append('startPageId', '1');
formData.append('endPageId', '1');
formData.append('pages', JSON.stringify([{ id: '1', imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' }]));

fetch('http://localhost:3011/api/transcode/start', {
  method: 'POST',
  body: formData
}).then(res => res.json()).then(console.log).catch(console.error);
