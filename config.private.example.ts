function getEnv(key: any, _default: any, type = 's') {
    if (!!process.env[key] === false) {
        return _default;
    }
    const value: any = process.env[key];
    switch (type) {
        case 'b':
            return value.toLowerCase() === 'true';
        case 'n':
            return parseInt(value, 10);
        default:
            return value;
    }
}
​
// E-mail server settings
export const enviarMail = {
    host: getEnv('EMAIL_HOST', 'smtp.gmail.com'),
    port: getEnv('EMAIL_PORT', 587, 'n'),
    secure: getEnv('EMAIL_SECURE', false, 'b'),
    auth: {
        user: getEnv('EMAIL_USERNAME', 'xxxxxxxxx@gmail.com'),
        pass: getEnv('EMAIL_PASSWORD', 'xxxxxxx')
    }
};

export const APP_DOMAIN  = getEnv('APP_DOMAIN', 'http://localhost:4200');