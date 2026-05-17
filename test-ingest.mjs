import './ingest/geology.ts';

async function main() {
  try {
    const mod = await import('./src/ingest/geology.ts');
    await mod.ingestGeology();
    console.log('Done');
  } catch (e) {
    console.error('FAILED:', e);
    process.exit(1);
  }
}
main();