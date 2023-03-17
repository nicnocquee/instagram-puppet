import edgeChromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";
const LOCAL_CHROME_EXECUTABLE =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

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
    const executablePath =
      (await edgeChromium.executablePath) || LOCAL_CHROME_EXECUTABLE;

    const browser = await puppeteer.launch({
      executablePath,
      args: edgeChromium.args,
      headless: false,
    });
    const page = await browser.newPage();

    await page.goto(theURL.toString(), { waitUntil: "networkidle0" });
    await page.setViewport({ width: 1024, height: 768 });
    const buttonText = "Allow essential and optional cookies";
    const button = await page.evaluateHandle(
      (text) =>
        [...document.querySelectorAll("button")].find(
          (button) => button.textContent.trim() === text
        ),
      buttonText
    );

    if (button.asElement()) {
      // Click the button
      await button.asElement().click();
    } else {
      console.log(`Button with text "${buttonText}" not found.`);
    }

    console.log("wait for 5 seconds");
    await page.waitForTimeout(5000);

    const imgElements = await page.$$("img");
    console.log(`number of img`, imgElements.length);

    // Extract the src attribute values
    for (let img of imgElements) {
      const src = await img.getProperty("srcset");
      const srcValue = await src.jsonValue();
      console.log(srcValue);
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
