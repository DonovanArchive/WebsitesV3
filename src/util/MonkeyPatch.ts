import "source-map-support/register-hook-require";
import moduleAlias from "module-alias";
import { resolve } from "path/posix";
const d = resolve(`${__dirname}/../../`);
moduleAlias.addAliases({
	"@root":   d,
	"@config": `${d}/src/config`,
	"@util":   `${d}/src/util`,
	"@db":     `${d}/src/db`,
	"@models": `${d}/src/db/Models`,
	"@lib":    `${d}/src/lib`
});
