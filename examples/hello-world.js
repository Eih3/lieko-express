const Lieko = require('lieko-express');

const app = new Lieko();

app.get('/', (req, res) => {
    res.send('Hello from lieko-express!');
});

app.listen(3000, () => {
    console.log(`Server running on http://localhost:3000`);
});