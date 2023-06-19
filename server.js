import formidable, { errors as formidableErrors } from "formidable";
import http from "http";
import fs from "fs";
import path from "path";
import * as url from "url";
import ejs from "ejs";
import slugify from "slugify";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const serverKonfiguracija = {
  putanja: __dirname + "/public",
  port: 8000,
};

const server = http.createServer((req, res) => {
  if (req.method === "GET") {
    handleGetRequest(req, res);
  } else if (req.method === "POST") {
    if (req.url === "/upload") {
      handleFileUpload(req, res);
    } else {
      handlePostRequest(req, res);
    }
  } else {
    handleInvalidRequest(res);
  }
});

function handleGetRequest(req, res) {
  const putanjaDatoteke = path.join(serverKonfiguracija.putanja, req.url);
  const fileStream = fs.createReadStream(putanjaDatoteke);
  const ekstenzija = path.extname(putanjaDatoteke);
  const contentType = getContentType(ekstenzija);

  fileStream.on("error", () => {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Datoteka nije pronađena!");
  });

  res.setHeader("Content-Type", contentType);

  res.statusCode = 200;
  fileStream.pipe(res);
}

function handlePostRequest(req, res) {
  let body = "";

  req.on("data", (data) => {
    body += data;
  });

  req.on("end", () => {
    const formData = new URLSearchParams(body);
    const ime = formData.get("ime");
    const email = formData.get("email");
    const poruka = formData.get("poruka");

    const data = {
      ime: ime,
      email: email,
      poruka: poruka,
    };

    const templatePath = path.join(__dirname, "public/data.ejs");

    fs.readFile(templatePath, "utf8", (err, templateContent) => {
      if (err) {
        res.statusCode = 500;
        res.end("Internal Server Error");
        return;
      }

      const renderedTemplate = ejs.render(templateContent, data);

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(renderedTemplate);
    });
  });
}

function handleFileUpload(req, res) {
  const form = formidable({
    defaultInvalidName: "invalid",
    uploadDir: `uploads`,
    keepExtensions: true,
    createDirsFromUploads: true,
    allowEmptyFiles: true,
    minFileSize: 0,
    filename(name, ext, part, form) {
      const { originalFilename } = part;
      if (!originalFilename) {
        return "invalid";
      }

      return originalFilename
        .split("/")
        .map((subdir) => {
          return slugify(subdir, { separator: "" });
        })
        .join("/");
    },
    filter: function ({ name, originalFilename, mimetype }) {
      return Boolean(originalFilename);
    },

    maxFileSize: 1 * 1024 * 1024,
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error(err);
      res.writeHead(err.httpCode || 400, { "Content-Type": "text/plain" });
      res.end(String(err));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ fields, files }, null, 2));
  });
}

function getContentType(extname) {
  switch (extname) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    default:
      return null;
  }
}

server.listen(serverKonfiguracija.port, () => {
  console.log(`Server sluša na vratima ${serverKonfiguracija.port}`);
});
