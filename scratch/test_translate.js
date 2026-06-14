async function test() {
  const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent('谢谢') + '&langpair=zh|de';
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error(err);
  }
}
test();
