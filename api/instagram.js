import { executablePath, puppeteer } from "chrome-aws-lambda";

export default async function handler(request, response) {
  const { url } = request.query;
  if (typeof url !== "string") {
    return response.status(401).json({ message: "invalid input 1" });
  }

  const imgSrcs = [];

  try {
    const theURL = new URL(url);
    if (!theURL) {
      return response.status(401).json({ message: "invalid input 2" });
    }
    if (theURL.host.indexOf("instagram") === -1) {
      return response.status(401).json({ message: "invalid input 3" });
    }

    const browser = await puppeteer.launch({
      executablePath: await executablePath,
    });
    const page = await browser.newPage();

    await page.goto(theURL.toString(), { waitUntil: "networkidle0" });
    await page.setViewport({ width: 1024, height: 768 });

    const imgElements = await page.$$("img");

    // Extract the src attribute values
    for (let img of imgElements) {
      const src = await img.getProperty("srcset");
      const srcValue = await src.jsonValue();
      if (srcValue && srcValue.length > 0) {
        const bigImg = srcValue
          .split("w,")
          .find((s) => s.indexOf("1080w") > -1);
        if (bigImg) {
          imgSrcs.push(bigImg.replace(" 1080w", ""));
        }
      }
    }
  } catch (error) {
    console.error(error);
    return response.status(401).json({ message: "invalid input 4" });
  }

  return response.status(200).json(imgSrcs);
}
