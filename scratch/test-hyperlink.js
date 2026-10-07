const pptxgen = require('pptxgenjs');
const fs = require('fs');

const pres = new pptxgen();
const s1 = pres.addSlide();
const s2 = pres.addSlide();

s1.addText('Click me to go to slide 2', {
  x: 1, y: 1, w: 5, h: 1,
  fontSize: 18,
  hyperlink: { slide: 2 }
});

s2.addText('You reached slide 2! Click to go back', {
  x: 1, y: 1, w: 5, h: 1,
  fontSize: 18,
  hyperlink: { slide: 1 }
});

pres.writeFile({ fileName: 'c:/tmo/scratch/test_link.pptx' })
  .then(() => console.log('Successfully written test_link.pptx'))
  .catch(console.error);
