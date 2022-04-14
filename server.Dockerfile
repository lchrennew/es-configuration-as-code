FROM es-configuration-as-code/deps:latest
COPY src /es-configuration-as-code/src
CMD sh start.sh
