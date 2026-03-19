import liff from "@line/liff";

let liffInitialized = false;

export async function initLiff(): Promise<typeof liff> {
  if (!liffInitialized) {
    await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
    liffInitialized = true;
  }
  return liff;
}

export { liff };
