/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
/* eslint-disable no-undef */
/* eslint-disable camelcase */
// Get recommendations dari model
// Import the required modules
const express = require('express');
const app = express();

const datafix = require('./datafix.json'); // Import your data and label mapping
const label_mapping = require('./label_mapping.json'); // Import your data and label mapping
const regency_num = require('./regency_num.json'); // Import regency name and regency number
app.use(express.json());

app.get('/recommendations/:price/:regency', (req, res) => {
  const input_price = parseInt(req.params.price); // Input price
  const input_regency = req.params.regency; // Input regency (as string)
  // Content-based filtering code to generate recommendations
  // Get the regency label based on the input regency name
  const regency = regency_num.find((item) => item.Regency === input_regency);
  if (!regency) {
    return res.status(400).json({error: 'Invalid regency name'});
  }
  const input_regency_label = regency['Regency Num'];

  // De-encode the output labels
  const inverse_mapping = {};
  for (const item of label_mapping) {
    inverse_mapping[item.Label] = item.Name;
  }

  // Filter the data based on input regency
  const filtered_data = datafix.filter((item) => item.Regency === input_regency_label);

  // Create a list of items where each item is represented as (price, name)
  const items = filtered_data.map((item) => [
    parseInt(item.Price),
    item.Name,
    item.Province,
    item.Rating,
  ]);

  // KNAPSACK PROBLEM
  // Helper function to shuffle an array in place
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  const n = items.length;
  shuffleArray(items); // Shuffle a list of items to get different combinations
  const dp = Array.from({length: n + 1}, () => Array.from({length: input_price + 1}, () => 0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= input_price; j++) {
      if (items[i - 1][0] <= j) {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i - 1][j - items[i - 1][0]] + 1);
      } else {
        dp[i][j] = dp[i - 1][j];
      }
    }
  }

  // Find the items included in the optimal solution
  const included_items = [];
  let i = n;
  let j = input_price;
  while (i > 0 && j > 0) {
    if (dp[i][j] !== dp[i - 1][j]) {
      included_items.push(items[i - 1]);
      j -= items[i - 1][0];
    }
    i -= 1;
  }

  // De-encode the included items
  const deencoded_included_items = included_items.map(([price, name, province, rating]) => ({
    price,
    name: inverse_mapping[name],
    province,
    rating,
  }));

  // Prepare the recommendations as an array of objects
  const recommendationList = deencoded_included_items;

  // Send the recommendations as the API response
  res.status(200).send({status: 'Berhasil', data: recommendationList});
});
