# 정적 HTML/CSS/JS 사이트를 nginx로 서빙하는 경량 이미지
FROM nginx:1.27-alpine

LABEL maintainer="infraplatform"
LABEL description="인프라 자동화 플랫폼 - 정적 사이트"

RUN rm -rf /usr/share/nginx/html/*

COPY index.html /usr/share/nginx/html/
COPY idc-request.html /usr/share/nginx/html/
COPY cert-verify.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
