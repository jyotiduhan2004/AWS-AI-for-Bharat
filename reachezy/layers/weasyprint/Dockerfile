FROM amazonlinux:2023

# Install system dependencies required by WeasyPrint
RUN dnf install -y \
    python3.12 \
    python3.12-pip \
    python3.12-devel \
    gcc \
    cairo-devel \
    pango-devel \
    gdk-pixbuf2-devel \
    libffi-devel \
    && dnf clean all

# Install WeasyPrint into Lambda layer structure
RUN mkdir -p /opt/python && \
    pip3.12 install weasyprint -t /opt/python

# Package the layer
RUN cd /opt && zip -r9 /tmp/weasyprint-layer.zip python/

# Copy system shared libraries needed at runtime
RUN mkdir -p /opt/lib && \
    cp /usr/lib64/libcairo.so* /opt/lib/ && \
    cp /usr/lib64/libpango*.so* /opt/lib/ && \
    cp /usr/lib64/libgdk_pixbuf*.so* /opt/lib/ && \
    cp /usr/lib64/libgobject*.so* /opt/lib/ && \
    cp /usr/lib64/libgio*.so* /opt/lib/ && \
    cp /usr/lib64/libglib*.so* /opt/lib/ && \
    cp /usr/lib64/libfontconfig.so* /opt/lib/ && \
    cp /usr/lib64/libfreetype.so* /opt/lib/ && \
    cp /usr/lib64/libharfbuzz.so* /opt/lib/ && \
    cp /usr/lib64/libfribidi.so* /opt/lib/ && \
    cd /opt && zip -r9 /tmp/weasyprint-layer.zip lib/

CMD ["echo", "Layer built at /tmp/weasyprint-layer.zip"]
