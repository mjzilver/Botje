import { describe, it, expect } from "vitest";
import { scoreMessages } from "../../features/nlp/sentimentAnalyzer";

describe("scoreMessages", () => {
    describe("positive topic extraction", () => {
        it("captures the word immediately following a positive AFINN trigger", () => {
            const { likes } = scoreMessages(["I love gaming"], new Set());
            expect(likes).toContain("gaming");
        });

        it("captures a topic after a non-love positive trigger word", () => {
            const { likes } = scoreMessages(["amazing pizza"], new Set());
            expect(likes).toContain("pizza");
        });

        it("captures multiple distinct topics from separate messages", () => {
            const { likes } = scoreMessages(["I love cats", "I love gaming"], new Set());
            expect(likes).toContain("cats");
            expect(likes).toContain("gaming");
        });

        it("ranks a topic mentioned more often above one mentioned less", () => {
            const { likes } = scoreMessages(["I love cats", "I love cats", "I love cats", "I love gaming"], new Set());
            expect(likes[0]).toBe("cats");
        });

        it("accumulates score when the same topic follows different positive words", () => {
            const { likes } = scoreMessages(["I love gaming", "amazing gaming", "wonderful gaming"], new Set());
            expect(likes[0]).toBe("gaming");
        });
    });

    describe("negative topic extraction", () => {
        it("captures the word immediately following a negative AFINN trigger", () => {
            const { dislikes } = scoreMessages(["I hate mornings"], new Set());
            expect(dislikes).toContain("mornings");
        });

        it("captures a topic after a non-hate negative trigger word", () => {
            const { dislikes } = scoreMessages(["terrible traffic"], new Set());
            expect(dislikes).toContain("traffic");
        });

        it("captures multiple distinct disliked topics", () => {
            const { dislikes } = scoreMessages(["I hate mornings", "I hate traffic"], new Set());
            expect(dislikes).toContain("mornings");
            expect(dislikes).toContain("traffic");
        });

        it("ranks the most frequently disliked topic first", () => {
            const { dislikes } = scoreMessages(
                ["I hate meetings", "I hate meetings", "I hate meetings", "I hate traffic"],
                new Set(),
            );
            expect(dislikes[0]).toBe("meetings");
        });
    });

    describe("mixed sentiment", () => {
        it("produces both likes and dislikes from the same corpus", () => {
            const { likes, dislikes } = scoreMessages(["I love gaming", "I hate meetings"], new Set());
            expect(likes).toContain("gaming");
            expect(dislikes).toContain("meetings");
        });

        it("a topic never appears in both likes and dislikes simultaneously", () => {
            const { likes, dislikes } = scoreMessages(["I love cats", "I hate cats"], new Set());
            const inBoth = likes.includes("cats") && dislikes.includes("cats");
            expect(inBoth).toBe(false);
        });

        it("places a topic in likes when positive mentions outweigh negative", () => {
            const { likes, dislikes } = scoreMessages(
                ["I love cats", "I love cats", "I love cats", "I hate cats"],
                new Set(),
            );
            expect(likes).toContain("cats");
            expect(dislikes).not.toContain("cats");
        });

        it("places a topic in dislikes when negative mentions outweigh positive", () => {
            const { likes, dislikes } = scoreMessages(
                ["I hate meetings", "I hate meetings", "I hate meetings", "I love meetings"],
                new Set(),
            );
            expect(dislikes).toContain("meetings");
            expect(likes).not.toContain("meetings");
        });
    });

    describe("filtering — sentiment words", () => {
        it("does not include the positive trigger word itself in likes", () => {
            const { likes } = scoreMessages(["I love gaming"], new Set());
            expect(likes).not.toContain("love");
        });

        it("does not include the negative trigger word itself in dislikes", () => {
            const { dislikes } = scoreMessages(["I hate meetings"], new Set());
            expect(dislikes).not.toContain("hate");
        });

        it("does not include any AFINN sentiment word as a topic", () => {
            const { likes, dislikes } = scoreMessages(["I love amazing gaming", "I hate terrible meetings"], new Set());
            for (const word of ["love", "amazing", "hate", "terrible"]) {
                expect(likes).not.toContain(word);
                expect(dislikes).not.toContain(word);
            }
        });
    });

    describe("filtering — stop words", () => {
        it("removes a stop word from likes", () => {
            const { likes } = scoreMessages(["I love gaming"], new Set(["gaming"]));
            expect(likes).not.toContain("gaming");
        });

        it("removes a stop word from dislikes", () => {
            const { dislikes } = scoreMessages(["I hate mornings"], new Set(["mornings"]));
            expect(dislikes).not.toContain("mornings");
        });

        it("keeps topics that are not stop words", () => {
            const { likes } = scoreMessages(["I love gaming", "I love coffee"], new Set(["gaming"]));
            expect(likes).toContain("coffee");
            expect(likes).not.toContain("gaming");
        });
    });

    describe("filtering — non-topic parts of speech", () => {
        it("excludes conjunctions and prepositions like than, with", () => {
            const { likes, dislikes } = scoreMessages(["I love than", "I hate with"], new Set());
            expect(likes).not.toContain("than");
            expect(dislikes).not.toContain("with");
        });

        it("excludes known adjectives like old, new", () => {
            const { likes } = scoreMessages(["I love old", "I love new"], new Set());
            expect(likes).not.toContain("old");
            expect(likes).not.toContain("new");
        });

        it("keeps gerunds like gaming and swimming as valid topics", () => {
            const { likes, dislikes } = scoreMessages(["I love gaming", "I hate swimming"], new Set());
            expect(likes).toContain("gaming");
            expect(dislikes).toContain("swimming");
        });

        it("excludes short light-verb gerunds like doing, going, being", () => {
            const { likes } = scoreMessages(["I love doing", "I love going", "I love being"], new Set());
            expect(likes).not.toContain("doing");
            expect(likes).not.toContain("going");
            expect(likes).not.toContain("being");
        });

        it("keeps unknown words that compromise cannot classify", () => {
            const { likes } = scoreMessages(["I love zorbfest"], new Set());
            expect(likes).toContain("zorbfest");
        });
    });

    describe("filtering — indefinite pronouns", () => {
        it("excludes something, anything, everything, nothing", () => {
            const msgs = ["I love something", "I love anything", "I love everything", "I hate nothing"];
            const { likes, dislikes } = scoreMessages(msgs, new Set());
            for (const word of ["something", "anything", "everything", "nothing"]) {
                expect(likes).not.toContain(word);
                expect(dislikes).not.toContain(word);
            }
        });

        it("excludes somebody, anybody, everybody, nobody", () => {
            const msgs = ["I love somebody", "I love anybody", "I love everybody", "I hate nobody"];
            const { likes, dislikes } = scoreMessages(msgs, new Set());
            for (const word of ["somebody", "anybody", "everybody", "nobody"]) {
                expect(likes).not.toContain(word);
                expect(dislikes).not.toContain(word);
            }
        });

        it("excludes someone, anyone, everyone, noone", () => {
            const msgs = ["I love someone", "I love anyone", "I love everyone", "I hate noone"];
            const { likes, dislikes } = scoreMessages(msgs, new Set());
            for (const word of ["someone", "anyone", "everyone", "noone"]) {
                expect(likes).not.toContain(word);
                expect(dislikes).not.toContain(word);
            }
        });

        it("excludes somewhere, anywhere, everywhere, nowhere", () => {
            const msgs = ["I love somewhere", "I love anywhere", "I love everywhere", "I hate nowhere"];
            const { likes, dislikes } = scoreMessages(msgs, new Set());
            for (const word of ["somewhere", "anywhere", "everywhere", "nowhere"]) {
                expect(likes).not.toContain(word);
                expect(dislikes).not.toContain(word);
            }
        });
    });

    describe("filtering — contraction artifacts", () => {
        it("excludes thats, thatve, thatd", () => {
            const msgs = ["I love thats", "I love thatve", "I love thatd"];
            const { likes } = scoreMessages(msgs, new Set());
            expect(likes).not.toContain("thats");
            expect(likes).not.toContain("thatve");
            expect(likes).not.toContain("thatd");
        });

        it("excludes youre, youll, youve, youd", () => {
            const msgs = ["I love youre", "I love youll", "I love youve", "I love youd"];
            const { likes } = scoreMessages(msgs, new Set());
            for (const word of ["youre", "youll", "youve", "youd"]) {
                expect(likes).not.toContain(word);
            }
        });

        it("excludes theyre, theyll, theyve, theyd", () => {
            const msgs = ["I hate theyre", "I hate theyll", "I hate theyve", "I hate theyd"];
            const { dislikes } = scoreMessages(msgs, new Set());
            for (const word of ["theyre", "theyll", "theyve", "theyd"]) {
                expect(dislikes).not.toContain(word);
            }
        });

        it("excludes ive, ill, ire", () => {
            const msgs = ["I love ive", "I love ill", "I love ire"];
            const { likes } = scoreMessages(msgs, new Set());
            for (const word of ["ive", "ill", "ire"]) {
                expect(likes).not.toContain(word);
            }
        });
    });

    describe("result shape", () => {
        it("returns empty likes and dislikes for an empty message array", () => {
            const { likes, dislikes } = scoreMessages([], new Set());
            expect(likes).toHaveLength(0);
            expect(dislikes).toHaveLength(0);
        });

        it("returns empty results when no messages contain sentiment words", () => {
            const { likes, dislikes } = scoreMessages(["the quick brown fox", "hello world today"], new Set());
            expect(likes).toHaveLength(0);
            expect(dislikes).toHaveLength(0);
        });

        it("returns at most 5 likes even with many distinct topics", () => {
            const msgs = [
                "I love cats",
                "I love dogs",
                "I love birds",
                "I love fish",
                "I love frogs",
                "I love lizards",
            ];
            const { likes } = scoreMessages(msgs, new Set());
            expect(likes.length).toBeLessThanOrEqual(5);
        });

        it("returns at most 5 dislikes even with many distinct topics", () => {
            const msgs = [
                "I hate cats",
                "I hate dogs",
                "I hate birds",
                "I hate fish",
                "I hate frogs",
                "I hate lizards",
            ];
            const { dislikes } = scoreMessages(msgs, new Set());
            expect(dislikes.length).toBeLessThanOrEqual(5);
        });

        it("likes and dislikes contain no overlap", () => {
            const msgs = [
                "I love gaming",
                "I love coffee",
                "I love music",
                "I hate meetings",
                "I hate mornings",
                "I hate traffic",
            ];
            const { likes, dislikes } = scoreMessages(msgs, new Set());
            const overlap = likes.filter((t) => dislikes.includes(t));
            expect(overlap).toHaveLength(0);
        });
    });

    describe("input handling", () => {
        it("matches case-insensitively", () => {
            const { likes } = scoreMessages(["I LOVE GAMING"], new Set());
            expect(likes).toContain("gaming");
        });

        it("handles punctuation in messages without breaking topic capture", () => {
            const { likes } = scoreMessages(["I love gaming!!!", "I love coffee..."], new Set());
            expect(likes).toContain("gaming");
            expect(likes).toContain("coffee");
        });

        it("does not capture topics shorter than 3 characters", () => {
            const { likes } = scoreMessages(["I love it", "I love go"], new Set());
            expect(likes).not.toContain("it");
            expect(likes).not.toContain("go");
        });

        it("does not capture topics from a sentence with no AFINN sentiment words", () => {
            const { likes, dislikes } = scoreMessages(["the brown fox jumps over the fence"], new Set());
            expect(likes).toHaveLength(0);
            expect(dislikes).toHaveLength(0);
        });
    });

    describe("performance", () => {
        it("processes 25000 messages within 5 seconds", () => {
            const pool = [
                "I love gaming and coding every day",
                "I hate mornings they are the worst",
                "pizza is amazing best food ever",
                "meetings are boring and terrible",
                "cats are so cute and loveable",
                "traffic is awful i hate commuting",
                "music makes everything better honestly",
                "work is stressful but rewarding sometimes",
            ];
            const messages = Array.from({ length: 25000 }, (_, i) => pool[i % pool.length]);
            const start = Date.now();
            scoreMessages(messages, new Set(["every", "day", "best", "ever"]));
            expect(Date.now() - start).toBeLessThan(5000);
        });
    });
});
