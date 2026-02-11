# Build the C ZIP builder (requires libzip: e.g. brew install libzip, or apt install libzip-dev)
CC ?= gcc
CFLAGS ?= -O2 -Wall -Wextra
LDFLAGS ?= -lzip

BIN = zip_from_stdin
SRC = zip_from_stdin.c

.PHONY: all clean

all: $(BIN)

$(BIN): $(SRC)
	$(CC) $(CFLAGS) -o $(BIN) $(SRC) $(LDFLAGS)

clean:
	rm -f $(BIN)
