# PEBLGen

AI-powered image generation app for creating scientific illustrations of marine species using OpenAI's DALL-E 3 API.

## Features

- **Multi-page navigation**: Sketcher, Timesheet, and Spend pages
- **Batch image generation**: Generate multiple species illustrations at once
- **Cost tracking**: Real-time cost tracking ($0.04 per image)
- **Excel/CSV paste support**: Paste species lists directly from spreadsheets
- **Flexible input**: Works with Latin names, common names, or both
- **Customizable style**: Editable system prompt for controlling art style

## Pages

1. **Sketcher** 🐠 - Marine Species Sketcher
2. **Timesheet** ⏰ - Timesheet (same functionality)
3. **Spend** 💰 - Spend tracking (same functionality)

## Setup

⚠️ **IMPORTANT**: Before using this app, you need to add your OpenAI API key:

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Open each HTML file (index.html, timesheet.html, spend.html)
3. Find the line: `const API_KEY = 'YOUR_API_KEY_HERE';`
4. Replace `'YOUR_API_KEY_HERE'` with your actual API key

## Usage

1. Open `index.html` in a web browser
2. Enter species names (Latin and/or common names)
3. Click "Add Row" to add more species
4. Click "Batch Generate All" to create all illustrations
5. Use the navigation buttons to switch between pages

## Features

- **Paste from Excel**: Copy species lists from spreadsheets and paste directly
- **Regenerate**: Re-generate individual images if not satisfied
- **Cost tracker**: Shows total cost and image count in real-time

## Technologies

- HTML/CSS/JavaScript
- OpenAI DALL-E 3 API
- Responsive design with gradient navigation

## License

All rights reserved.
