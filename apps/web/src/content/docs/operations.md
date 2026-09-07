---
title: Operations
description: Understand the supported Rastry operation union and how to choose each transformation.
slug: docs/operations
---

A pipeline is an ordered list of operations. The current shared contract validates these six operation types before any input is processed:

| Operation      | Use it for                                                   | Reference                                     |
| -------------- | ------------------------------------------------------------ | --------------------------------------------- |
| resize         | Proportional limits or exact dimensions with a declared fit. | [Resize](/operations/resize/)                 |
| crop           | An explicit area or anchored target dimensions.              | [Crop](/operations/crop/)                     |
| trim           | Removing transparent borders from compatible images.         | [Trim](/operations/trim/)                     |
| padding        | Adding transparent or colored space around an image.         | [Padding](/operations/padding/)               |
| convert        | Writing PNG, JPEG, or WebP output and choosing quality.      | [Convert](/operations/convert/)               |
| strip-metadata | Removing EXIF and unnecessary metadata.                      | [Strip metadata](/operations/strip-metadata/) |

There is no separate compress operation. Compression is expressed by choosing an output format and, for JPEG/WebP, a quality value on convert.

## Ordering matters

Resize or crop before conversion when you want to reduce the amount of work and control the final dimensions. Strip metadata near the end so the output is clean. The [pipeline guide](/docs/pipelines/) shows a complete example.
