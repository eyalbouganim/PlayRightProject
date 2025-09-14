const express = require('express');
const app = express();
const PORT = 8080;

app.get('/', (req, res) => {
    res.send('Hello, Eyal!');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});