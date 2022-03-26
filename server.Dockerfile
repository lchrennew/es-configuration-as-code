FROM es-configuration-as-code/deps:1.0.0
COPY src /es-configuration-as-code/src
CMD sh start.sh
