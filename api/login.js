module.exports = (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send({ message: 'Only POST requests allowed' });
        return;
    }

    const { password } = req.body;
    const storedPassword = process.env.LOGIN_PASSWORD;

    if (password === storedPassword) {
        res.setHeader('Set-Cookie', 'authenticated=true; HttpOnly; Path=/');
        res.status(200).json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
};
