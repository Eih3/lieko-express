const Lieko = require('lieko-express');

const app = new Lieko();

app.debug(true);
app.bodyParser({ limit: '5mb' });
app.cors({ origin: '*' });

app.get('/', (req, res) => {
    const routes = app.listRoutes();
    res.ok(routes);
});

app.get('/users/:id', (req, res) => {
    res.ok({ id: req.params.id, name: 'Alice' });
});

app.post('/users', (req, res) => {
    res.created(req.body);
});

app.listen(3000, () => {
    console.log(`Server running on http://localhost:3000`);
});