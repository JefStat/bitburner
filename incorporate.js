let ns;
let c;

/** @param {NS} pns **/
export async function main(pns) {
	ns = pns;
	c = ns.corporation;
	if (!c.getCorporation()) {
		ns.tprint('no corp, get out!');
		ns.print('no corp, get out!');
	}
	await expand();
	sell();
	await upgrade(1);
	await upgrade(2);
}

let upgradeNames  = ['Focus Wires', 'Neural Accelerators', ' Speech Processor Implants', 'Nuoptimal Nootropic Injector Implants', 'Smart Factories'];
async function upgrade(k) {
	let i = 0;
	while ( i< upgradeNames.length) {
		let upgradeName = upgradeNames[i];
		if (c.getUpgradeLevelCost(upgradeName) > ns.getServerMoneyAvailable("home")) {
			await ns.sleep(60 *1000);
			continue;
		}
		if (c.getUpgradeLevel(upgradeName) < k) {
			c.levelUpgrade(upgradeName);
		}

		i++;
	}
}

function sell() {
	for(let cityName of cities) {
		c.sellMaterial(divisions[0], cityName, 'Plants', 'MAX', 'MP');
		c.sellMaterial(divisions[0], cityName, 'Food', 'MAX', 'MP');
	}
}

let cities = ['Sector-12', 'Aevum', 'Volhaven', 'Chongqing', 'New Tokyo', 'Ishima'];
let divisions = ['Agriculture'];
let jobs = ['Operations', 'Engineer', 'Business'];
let jobs2 = ['Operations', 'Engineer', 'Business', 'Management', 'Research & Development', 'Training'];
async function expand() {
	let i = 0;
	while (i < cites.length) {
		if (c.getExpandCityCost() > ns.getServerMoneyAvailable("home")) {
			await ns.sleep(60 *1000);
			continue;
		}
		let divisionName = divisions[0];
		let cityName =cities[i];

		c.expandCity(divisionName, cityName);
		c.setSmartSupply(divisionName, cityName, true);

		let emp = c.hireEmployee(divisionName, cityName);
		let job = 'Operations';
		c.assignJob(divisionName, cityName, emp.name, job);

		emp = c.hireEmployee(divisionName, cityName);
		job = 'Engineer';
		c.assignJob(divisionName, cityName, emp.name, job);
		
		emp = c.hireEmployee(divisionName, cityName);
		job = 'Business';
		c.assignJob(divisionName, cityName, emp.name, job);

		i++;
	}
	i = 0;
	while ( i< divisions.length) {
		if (c.getHireAdVertCost(divisions[i]) > ns.getServerMoneyAvailable("home")) {
			await ns.sleep(60 *1000);
			continue;
		}
		c.hireAdVert(divisions[i])
		i++;
	}

	i = 0;
	while ( i < cities.length) {
		let cityName = cities[i];
		let divisionName = divisions[0];
		
		if (c.hasWarehouse(divisionName, cityName)) {
		if (c.getUpgradeWarehouseCost(divisionName, cityName) > ns.getServerMoneyAvailable("home")) {
			await ns.sleep(60 *1000);
			continue;
		}
			c.upgradeWarehouse(divisionName, cityName);
		} else {
		if (c.getPurchaseWarehouseCost() > ns.getServerMoneyAvailable("home")) {
			await ns.sleep(60 *1000);
			continue;
		}
			c.purchaseWarehouse(divisionName, cityName);
		}

		i++;
	}
}