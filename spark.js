import cheerio from "https://dev.jspm.io/cheerio";
import { walk } from "https://deno.land/std/fs/mod.ts";

window.getPlaces = async (path = "/countries") => {
    console.log("scraping", path);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const response = await fetch("https://weatherspark.com" + path, {
        headers: { cookie: "unit-set=Metric" }
    });
    const text = await response.text();
    if (path.startsWith("/y/")) {
        const title = path.split("/")[2];
        await Deno.writeTextFile(`downloads/${title}.html`, text);
    } else {
        const $ = cheerio.load(text);
        const nodes = Object.values($(".ListPage-list a"));
        const paths = nodes.map(node => node.attribs?.href);
        const links = paths.filter(path => path?.startsWith("/"));
        for (const link of links) await getPlaces(link);
    }
};

window.getScores = async () => {
    for await (const file of walk("downloads")) {
        if (file.name.endsWith(".html")) {
            const result = {};
            const text = await Deno.readTextFile(file.path);
            const $ = cheerio.load(text);
            const topography = $("#Sections-Topography").nextAll("div").find("p").first().text().split(" ");
            const index = topography.indexOf("deg");
            result.latitude = topography[index - 1];
            result.longitude = topography[topography.indexOf("deg", index + 1) - 1];
            result.name = $("head > title").text().replace("Average Weather in ", "").replace(", Year Round - Weather Spark", "");
            console.log("extracting", result.name, "from", file.name);
            ["BestTimeTourism", "BestTimeBeach"].map(selctor => {
                let sum = 0;
                const key = selctor.replace("BestTime", "").toLowerCase();
                const path = $(`#Figures-${selctor}`).next().find("svg").find("path").last().attr("d");
                const relative = path.split("l").slice(1).map(item => item.split(",").pop());
                const absolute = relative.map(item => sum = (parseInt(item) * -1) + sum);
                result[key] = absolute.map(item => parseFloat((item / 1750).toFixed(2)));
            });
            const filename = file.name.replace(".html", ".json");
            await Deno.writeTextFile(`data/${filename}`, JSON.stringify(result));
        }
    }
};

for (const item of Deno.args) await window[item]();
