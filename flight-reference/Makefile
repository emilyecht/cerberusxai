CC ?= cc
CFLAGS ?= -std=c11 -O2 -Wall -Wextra -Werror -pedantic
CPPFLAGS ?= -Iinclude
BUILD := build
KERNEL := src/cerberus_authority.c

.PHONY: all test demo sanitize clean

all: $(BUILD)/cerberus-demo $(BUILD)/test-authority $(BUILD)/property-campaign

$(BUILD):
	mkdir -p $(BUILD)

$(BUILD)/cerberus-demo: $(KERNEL) src/demo.c include/cerberus_authority.h | $(BUILD)
	$(CC) $(CPPFLAGS) $(CFLAGS) $(KERNEL) src/demo.c -o $@

$(BUILD)/test-authority: $(KERNEL) tests/test_authority.c include/cerberus_authority.h | $(BUILD)
	$(CC) $(CPPFLAGS) $(CFLAGS) $(KERNEL) tests/test_authority.c -o $@

$(BUILD)/property-campaign: $(KERNEL) tests/property_campaign.c include/cerberus_authority.h | $(BUILD)
	$(CC) $(CPPFLAGS) $(CFLAGS) $(KERNEL) tests/property_campaign.c -o $@

test: $(BUILD)/test-authority $(BUILD)/property-campaign
	./$(BUILD)/test-authority
	./$(BUILD)/property-campaign

demo: $(BUILD)/cerberus-demo
	./$(BUILD)/cerberus-demo

sanitize: CFLAGS := -std=c11 -O1 -g -Wall -Wextra -Werror -pedantic -fsanitize=address,undefined -fno-omit-frame-pointer
sanitize: clean test

clean:
	rm -rf $(BUILD)
