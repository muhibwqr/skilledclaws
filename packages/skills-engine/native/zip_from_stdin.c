/*
 * zip_from_stdin.c
 * Build a ZIP archive from streamed stdin. For use with huge inputs;
 * processes one entry at a time to bound memory.
 *
 * Input format (binary-safe):
 *   LINE: path (no newline in path)
 *   LINE: size (decimal, content length in bytes)
 *   RAW:  exactly <size> bytes of content
 *   ... repeat ...
 *   LINE: "DONE"
 *
 * Output: ZIP file written to stdout.
 *
 * Build: make (requires libzip: e.g. brew install libzip)
 */

#define _POSIX_C_SOURCE 200809L

#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include <zip.h>

#define LINE_MAX 8192
#define TMP_TEMPLATE "/tmp/skills_zip_XXXXXX"

static int read_line(char *buf, size_t cap) {
  size_t i = 0;
  int c;
  while (i < cap - 1 && (c = getchar()) != EOF && c != '\n') buf[i++] = (char)c;
  buf[i] = '\0';
  return (c == EOF && i == 0) ? -1 : 0;
}

static int stream_zip_to_stdout(const char *tmp_path) {
  FILE *f = fopen(tmp_path, "rb");
  if (!f) {
    perror("fopen tmp");
    return -1;
  }
  char buf[65536];
  size_t n;
  while ((n = fread(buf, 1, sizeof(buf), f)) > 0) {
    if (fwrite(buf, 1, n, stdout) != n) {
      fclose(f);
      unlink(tmp_path);
      return -1;
    }
  }
  fclose(f);
  unlink(tmp_path);
  return 0;
}

int main(void) {
  char path_buf[LINE_MAX];
  char size_buf[64];
  zip_t *za = NULL;
  zip_error_t err;
  int fd = -1;
  char tmp_path[64];

  (void)snprintf(tmp_path, sizeof(tmp_path), "%s", TMP_TEMPLATE);
  fd = mkstemp(tmp_path);
  if (fd < 0) {
    perror("mkstemp");
    return 1;
  }
  close(fd);

  zip_error_init(&err);
  za = zip_open(tmp_path, ZIP_CREATE | ZIP_TRUNCATE, &err);
  if (!za) {
    fprintf(stderr, "zip_open: %s\n", zip_error_strerror(&err));
    unlink(tmp_path);
    zip_error_fini(&err);
    return 1;
  }
  zip_error_fini(&err);

  for (;;) {
    if (read_line(path_buf, sizeof(path_buf)) < 0) break;
    if (strcmp(path_buf, "DONE") == 0) break;

    if (read_line(size_buf, sizeof(size_buf)) < 0) {
      fprintf(stderr, "unexpected eof after path\n");
      zip_discard(za);
      unlink(tmp_path);
      return 1;
    }
    unsigned long long size_ull = strtoull(size_buf, NULL, 10);
    if (size_ull > SIZE_MAX) {
      fprintf(stderr, "entry too large\n");
      zip_discard(za);
      unlink(tmp_path);
      return 1;
    }
    size_t size = (size_t)size_ull;

    void *content = NULL;
    if (size > 0) {
      content = malloc(size);
      if (!content) {
        fprintf(stderr, "malloc %zu\n", size);
        zip_discard(za);
        unlink(tmp_path);
        return 1;
      }
      if (fread(content, 1, size, stdin) != size) {
        fprintf(stderr, "fread content short\n");
        free(content);
        zip_discard(za);
        unlink(tmp_path);
        return 1;
      }
    }

    zip_source_t *src = zip_source_buffer(za, content, size, 1);
    if (!src) {
      if (content) free(content);
      fprintf(stderr, "zip_source_buffer: %s\n", zip_strerror(za));
      zip_discard(za);
      unlink(tmp_path);
      return 1;
    }
    if (zip_file_add(za, path_buf, src, ZIP_FL_OVERWRITE) < 0) {
      zip_source_free(src);
      fprintf(stderr, "zip_file_add: %s\n", zip_strerror(za));
      zip_discard(za);
      unlink(tmp_path);
      return 1;
    }
  }

  if (zip_close(za) < 0) {
    fprintf(stderr, "zip_close: %s\n", zip_strerror(za));
    unlink(tmp_path);
    return 1;
  }

  if (stream_zip_to_stdout(tmp_path) < 0) return 1;
  return 0;
}
