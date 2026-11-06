// The PDF reader (unpdf, about 3 MB of the Worker's 13 MB) is loaded the
// first time a PDF is read, not when a Worker starts (user, November 6:
// "Go work startup"; a new isolate spent 0.6-1.2 s before the first line of
// the app ran). Few feeds read PDFs (official results PDFs, Midwest Timing).
export async function extractText(bytes,options){
  const {extractText:read}=await import('unpdf');
  return read(bytes,options);
}
