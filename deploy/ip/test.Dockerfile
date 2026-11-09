# Local validation only; never used to run the app on the VPS.
FROM caddy:2.11.7-alpine AS caddy
FROM ubuntu:24.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    bash ca-certificates curl iproute2 openssl python3 systemd \
    && rm -rf /var/lib/apt/lists/*
COPY --from=caddy /usr/bin/caddy /opt/munchkin-hero/bin/caddy
COPY deploy/ip /checks
RUN bash -n /checks/install-ip.sh \
    && bash -n /checks/setup.sh \
    && bash -n /checks/uninstall.sh \
    && bash -n /checks/update-ip.sh \
    && bash -n /checks/secure-update-ip.sh \
    && systemd-analyze verify /checks/munchkin-hero.service
CMD ["bash"]
