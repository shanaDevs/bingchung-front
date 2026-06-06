import { toPng } from 'html-to-image';

/** Save the receipt element as a PNG file */
export async function downloadReceiptPng(element: HTMLElement, orderNumber: string): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  });

  const link = document.createElement('a');
  link.download = `bingchun-receipt-${orderNumber}.png`;
  link.href = dataUrl;
  link.click();
}
