-- SymbolCache 는 ka10099 응답 캐시일 뿐이라(원본은 키움) 데이터를 버리고 다시 만든다.
-- code 단일 PK -> (market, code) 복합 PK: 같은 코드가 여러 시장 목록에 나오기 때문.
PRAGMA foreign_keys=OFF;

DROP TABLE "SymbolCache";

CREATE TABLE "SymbolCache" (
    "market" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("market", "code")
);

PRAGMA foreign_keys=ON;
