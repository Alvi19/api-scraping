import axios from "axios";
import fs from "fs";

const url =
  "http://localhost:3000/naver?url=https://search.shopping.naver.com/ns/v1/search/paged-composite-cards?cursor=1&pageSize=50&query=iphone&searchMethod=all.basic&isFreshCategory=false&isOriginalQuerySearch=false&isCatalogDiversifyOff=false&listPage=1&categoryIdsForPromotions=50000204&hiddenNonProductCard=true&hasMoreAd=true&hasMore=true&score=4.8%7C5";

const totalRequests = 1000;
const batchSize = 50;
let requestCount = 0;
let success = 0,
  fail = 0;
let latenciesAll = [];
// log fail .log save to file
const logStream = fs.createWriteStream("fail.log", { flags: "a" });
logStream.write(`\n\n=== New Test Run at ${new Date().toISOString()} ===\n`);

async function runBatch(startIndex) {
  const requests = [];
  const latencies = [];

  for (let i = 0; i < batchSize && startIndex + i < totalRequests; i++) {
    const start = Date.now();
    requests.push(
      axios
        .get(url)
        .then(() => {
          requestCount++;
          const latency = Date.now() - start;
          latencies.push(latency);
          latenciesAll.push(latency);
          success++;
          console.log(`✅ ${requestCount}: Success (latency: ${latency} ms)`);
        })
        .catch((err) => {
          requestCount++;
          const latency = Date.now() - start;
          latencies.push(latency);
          latenciesAll.push(latency);
          fail++;
          logStream.write(
            `Fail at ${new Date().toISOString()} (Request #${requestCount}, latency: ${latency} ms)\n`
          );
          logStream.write(`Request URL: ${url}\n\n`);
          if (err.response) {
            // Ada response dari server (API Naver / proxy)
            logStream.write(`Status: ${err.response.status}\n`);
            logStream.write(
              `Headers: ${JSON.stringify(err.response.headers, null, 2)}\n`
            );
            logStream.write(`Data: ${JSON.stringify(err.response.data)}\n\n`);
          } else if (err.request) {
            // Request terkirim tapi ga ada response (timeout / koneksi putus)
            logStream.write(`No response received (possible ECONNRESET)\n\n`);
          } else {
            // Error di sisi axios sendiri
            logStream.write(`Axios error: ${err.message}\n\n`);
          }
          console.log(`❌ ${requestCount}: Fail (latency: ${latency} ms)`);
        })
    );
  }

  await Promise.allSettled(requests);

  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  console.log(
    `Batch done (${
      startIndex + requests.length
    }/${totalRequests}) → ✅ ${success} success, ❌ ${fail} fail, Avg latency: ${avgLatency.toFixed(
      2
    )} ms`
  );
}

async function runAll() {
  for (let i = 0; i < totalRequests; i += batchSize) {
    await runBatch(i);
    await new Promise((r) => setTimeout(r, 500)); // delay antar batch
  }
  console.log(
    `🎉 All requests finished! AVG Latency Overall: ${(
      latenciesAll.reduce((a, b) => a + b, 0) / latenciesAll.length
    ).toFixed(2)} ms`
  );
}

runAll();
