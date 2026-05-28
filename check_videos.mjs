// check_videos.mjs - Check which R2 videos exist
import https from 'https';

const videos = ['ardyn_elch', 'tsogt_taij', 'tungalag_tamir', 'unur_bul'];
const base = 'https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev/videos/';

for (const v of videos) {
  await new Promise(res => {
    https.request(base + v + '.mp4', { method: 'HEAD' }, r => {
      console.log(`${v}: ${r.statusCode} (${r.headers['content-length'] || '?'} bytes)`);
      res();
    }).on('error', e => { console.log(`${v}: ERROR ${e.message}`); res(); }).end();
  });
}
