import * as fs from 'fs';
import moment = require('moment');
import Handlebars from 'handlebars';
// const handlebars = require('handlebars');
const path = require('path');
const nodemailer = require('nodemailer');

Handlebars.registerHelper('datetime', (dateTime: any) => {
    return moment(dateTime).format('D MMM YYYY [a las] H:mm [hs]');
});

export interface MailOptions {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    attachments: any;
}

export function sendMail(options: MailOptions) {
    return new Promise((resolve, reject) => {
        const transporter = nodemailer.createTransport({
            host: `${process.env.EMAIL_HOST}`,
            port: parseInt(`${process.env.EMAIL_PORT}`, 10),
            secure: (`${process.env.EMAIL_SECURE}` === 'true'),
            auth: {
                user: `${process.env.EMAIL_USERNAME}`,
                pass: `${process.env.EMAIL_PASSWORD}`
            },
        });

        const mailOptions = {
            from: options.from,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
            attachments: options.attachments
        };

        transporter.sendMail(mailOptions, (error: any, info: any) => {
            if (error) {
                return reject(error);
            }
            return resolve(info);
        });
    });
}

export function renderHTML(templateName: string, extras: any): Promise<string> {
    return new Promise((resolve, reject) => {
        // [TODO] Analizar el path relativo o absoluto
        const TEMPLATE_PATH = './src/templates/';
        const url = path.join(process.cwd(), TEMPLATE_PATH, templateName);

        fs.readFile(url, { encoding: 'utf-8' }, (err, html) => {
            if (err) {
                return reject(err);
            }
            try {
                const template = Handlebars.compile(html);
                const htmlToSend = template({ nombre: extras.usuario.businessName, url: extras.url, username: extras.usuario.username });
                return resolve(htmlToSend);
            } catch (exp) {
                return reject(exp);
            }

        });
    });
}