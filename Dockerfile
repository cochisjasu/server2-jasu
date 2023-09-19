FROM node:lts

WORKDIR /app

COPY . /app

RUN yarn

EXPOSE 4000

CMD ["npm", "run", "start"]