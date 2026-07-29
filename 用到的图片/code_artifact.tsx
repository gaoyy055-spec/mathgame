Request schema

POST http://<host>:8090/ocr
Content-Type: application/json

{
  "file": "<base64-encoded image bytes, no data: prefix>",
  "fileType": 1,
  "visualize": false
}

┌───────────┬─────────────────┬─────────────────────────────────────────────────────────────────────────────┐
│   Field   │      Type       │                                   Meaning                                   │
├───────────┼─────────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ file      │ string (base64) │ The image, standard base64. Can also be an image URL.                       │
├───────────┼─────────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ fileType  │ int             │ 1 = image. (0 = PDF.)                                                       │
├───────────┼─────────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ visualize │ bool            │ false = don't return rendered annotation images (keeps the response small). │
└───────────┴─────────────────┴─────────────────────────────────────────────────────────────────────────────┘

Response schema

200 OK, Content-Type: application/json — PaddleX pipeline serving shape:

{
  "logId": "uuid-string",
  "errorCode": 0,
  "errorMsg": "Success",
  "result": {
    "ocrResults": [
      {
        "prunedResult": {
          "rec_texts":  ["从前有一只小熊", "住在森林里"],
          "rec_scores": [0.9982, 0.9931],
          "rec_polys":  [[[x1,y1],[x2,y2],[x3,y3],[x4,y4]], ...],
          "rec_boxes":  [[x_min,y_min,x_max,y_max], ...]
        },
        "ocrImage": null,
        "docPreprocessingImage": null,
        "inputImage": null
      }
    ],
    "dataInfo": { }
  }
}
What the app actually consumes (server/internal/ocr/paddleocr.go), per detected text line, from result.ocrResults[0].prunedResult:

┌────────────┬───────────┬──────────────────────────────────────────────────────────────────┐
│   Field    │   Type    │                             Meaning                              │
├────────────┼───────────┼──────────────────────────────────────────────────────────────────┤
│ rec_texts  │ string[]  │ Recognized text, one per detected line                           │
├────────────┼───────────┼──────────────────────────────────────────────────────────────────┤
│ rec_scores │ float[]   │ Confidence 0–1, parallel to rec_texts                            │
├────────────┼───────────┼──────────────────────────────────────────────────────────────────┤
│ rec_polys  │ int[][][] │ 4-point quadrilateral per line: [[x,y]×4] (handles rotated text) │
├────────────┼───────────┼──────────────────────────────────────────────────────────────────┤
│ rec_boxes  │ int[][]   │ Axis-aligned box per line: [x_min, y_min, x_max, y_max]          │
└────────────┴───────────┴──────────────────────────────────────────────────────────────────┘

The four arrays are parallel — index i across all of them describes the same text line. Coordinates are in the input image's pixel space.

Error case: non-zero errorCode with errorMsg describing the failure; result may be absent. When visualize: true, the ocrImage/inputImage fields carry base64 PNGs instead of null (much larger response — the app keeps it false).

Quick test once ready

IMG=$(base64 -i your-image.jpg | tr -d '\n')
curl -s http://localhost:8090/ocr \
  -H 'Content-Type: application/json' \
  -d "{\"file\":\"$IMG\",\"fileType\":1,\"visualize\":false}" | jq '.result.ocrResults[0].prunedResult.rec_texts'