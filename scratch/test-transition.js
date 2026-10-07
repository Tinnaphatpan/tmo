const JSZip = require('jszip');
const fs = require('fs');

async function testTransitions() {
  const pptxPath = 'c:/tmo/TMO_Grading_Queue_Presentation.pptx';
  const data = fs.readFileSync(pptxPath);
  const zip = await JSZip.loadAsync(data);

  // Check slide1.xml
  const slide1Xml = await zip.file('ppt/slides/slide1.xml').async('string');
  console.log('Slide 1 ends with:', slide1Xml.slice(-100));

  // Test inserting transition
  const modified = slide1Xml.replace('</p:sld>', '<p:transition spd="med" advClick="1"><p:fade/></p:transition></p:sld>');
  zip.file('ppt/slides/slide1.xml', modified);

  const outBuf = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('c:/tmo/scratch/test_transition.pptx', outBuf);
  console.log('Saved test_transition.pptx successfully');
}

testTransitions().catch(console.error);
