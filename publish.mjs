import { Exec, Jet, PackageJSON, Semver } from '@digimuza/nscript'

async function main() {
	if (Jet.exists('lib')) {
		Jet.dir('lib').remove()
	}
	const packageJSON = PackageJSON.closest()
	const newVersion = Semver.inc(packageJSON.version, 'patch')
	const pub = {
		name: packageJSON.name,
		description: packageJSON.description,
		version: newVersion,
		main: 'lib/index.js',
		typings: 'lib/index.d.ts',
		dependencies: packageJSON.dependencies,
	}
	await Exec.script('Build', 'yarn build')
	Jet.write('lib/package.json', pub)
	Jet.copy('LICENSE', 'lib/LICENSE')
	await Exec.script('Publish', 'yarn publish', {
		cwd: 'lib',
	})
	Jet.write('package.json', {
		...packageJSON,
		version: pub.version,
	})
}

main()
