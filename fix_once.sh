#!/bin/bash
# One-time setup: sudo bash /home/bhuvans/Documents/final/fix_once.sh
echo "bhuvans ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose, /usr/lib/docker/cli-plugins/docker-compose" > /etc/sudoers.d/docker-nopasswd
chmod 440 /etc/sudoers.d/docker-nopasswd
usermod -aG docker bhuvans
chmod 666 /var/run/docker.sock
echo "Done. Docker now works without password."
