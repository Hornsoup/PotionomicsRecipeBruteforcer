import { Injectable } from '@angular/core';
import { IngredientsService, IngredientStats } from './ingredients.service';
import { MainLoopService } from './main-loop.service';
import { RankRepo, PotionRank } from './potion-rank.repo';


interface numDict {
  [key: string]: number
}

interface Recipe extends IngredientStats {
  rank: PotionRank;
  value: number;
  deviation: number;
}

export enum Senses {
  None,
  Taste,
  Touch,
  Smell,
  Sight,
  Sound
}

/** Contains everything from settings to the main combination methods and all related members. */
@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  rankRepo = new RankRepo;
  recipeList: Recipe[] = [];
  recipeListDisplay = [...this.recipeList];

  qualities: numDict = {
    "Perfect": 0.0025,
    "Very Stable": 0.05,
    "Stable": 0.15,
    "Unstable": 0.25,
  };

  private IngredAvail: numDict = {};
  private percA = 50 / 100;
  private percB = 50 / 100;
  private percC = 0 / 100;
  private percD = 0 / 100;
  private percE = 0 / 100;
  ingredientList: IngredientStats[] = []; // Used for display style changes
  indexer: number[] = []; // Used in display
  totalCount = 0; // For display
  hitCount = 0; // For display
  traits = [false, false, false, false, false] // For display and selection
  illusion = 0;
  topDeviate = 0.0025 // Perfect: 0.0025 Very: 0.05 Stable: 0.15 Unstable 0.25
  bottomDeviate = 0
  selectedFormula = 0
  selectedQuality = "Perfect"
  maxMagamin = 375;
  ingredCount = 8;
  shopBonus = 0;
  private slotIndex = 0; // only locally used for the recursive method. I can't be completely sure of my work.

  constructor(
    public mainLoopService: MainLoopService,
    public ingredientsService: IngredientsService,
  ) {
    this.topDeviate = 0.05; // @TODO remove debug
    mainLoopService.tickSubject.subscribe(() => {
      this.IngredAvail = {}
      for (let i = 0; i < this.ingredientsService.ingredients.length - 1; i++) { // this.IngredAvail[this.ingredientList[this.indexer[this.slotIndex]].index]
        if (this.ingredientsService.ingredients[i].Avail > 0) {
          this.IngredAvail[this.ingredientsService.ingredients[i].name] = this.ingredientsService.ingredients[i].Avail;
        }
      }
      this.discoverNewRecipe(this.initRecipe());
    });
  }

  /** Updates the formula ratios. */
  updateFormula() {
    this.percA = this.ingredientsService.formulas[this.selectedFormula].A;
    this.percB = this.ingredientsService.formulas[this.selectedFormula].B;
    this.percC = this.ingredientsService.formulas[this.selectedFormula].C;
    this.percD = this.ingredientsService.formulas[this.selectedFormula].D;
    this.percE = this.ingredientsService.formulas[this.selectedFormula].E;
    this.topDeviate = this.qualities[this.selectedQuality];
    this.buildIngredients();
    this.searchInit();
  }

  /** Initializes the working index of the search algorithms */
  indexerInit() {
    this.indexer = [];
    for (let i = 0; i < this.ingredCount; i++) {
      this.indexer.push(this.ingredientList.length - 1);
    }
  }

  /** Initializes the search list. */
  searchInit() {
    this.recipeList = [];
    this.totalCount = 0;
    this.hitCount = 0;
    this.slotIndex = 0;
  }

  /** Sorts the results of the sim prior to display, currently according to profit */
  recipeSort(list = this.recipeList) {
    list.sort((a, b) => (b.value * this.potionCount() - b.cost) - (a.value * this.potionCount() - a.cost));
  }

  /** Displays the recipes from index start to start + length.
   * @param size The length of the display, default 1000
   * @param start The starting index, default 0
   */
  recipeDisplay(length = 1000, start = 0) {
    this.recipeListDisplay = this.recipeList.slice(start, length);
  }

  /** Updates the recipe rank and value by comparing the rank repo with the total magamin count.
   * @param recipe The recipe in need of a rank and value update
   */
  recipeRank(recipe: Recipe) {
    const formula = this.ingredientsService.formulas[this.selectedFormula];
    const ranks = this.rankRepo.ranks;
    for (let i = 0; i <= this.rankRepo.ranks.length - 1; i++) {
      if (ranks[i].min <= recipe.Total && recipe.Total < ranks[i].max) {
        const bonus = this.shopBonus + recipe.Smell + recipe.Sight + recipe.Sound + recipe.Taste + recipe.Touch;
        let extra;
        if (recipe.deviation <= 0.0025) {
          extra = 2;
        }
        else if (recipe.deviation <= 0.05) {
          extra = 1;
        }
        else if (recipe.deviation <= 0.15) {
          extra = 0;
        }
        else {
          extra = -1;
        }
        recipe.rank = ranks[Math.min(i + extra, ranks.length - 1)];
        recipe.value = Math.round(recipe.rank.mult * formula.value * (bonus / 100 + 1));
        break;
      }
    }
  }

  /** A macro method to remember potions multiply based on ingredient count */
  potionCount() {
    return Math.floor(this.ingredCount / 2);
  }

  //@TODO Here's where my commenting gets dicey, gotta get it all down. This is the meat of the logic.


  /** Macro method to create a new blank recipe */
  initRecipe(): Recipe {
    return {
      index: 0,
      name: "",
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
      cost: 0,
      Total: 0,
      Taste: 0,
      Touch: 0,
      Smell: 0,
      Sight: 0,
      Sound: 0,
      Rarity: "",
      Location: "",
      Type: "",
      Avail: 0,
      rank: this.rankRepo.ranks[0],
      value: 0,
      deviation: 0,
    }
  }

  /** Builds the viable ingredients list for the active recipe.  
   * @param arr the list of ingredients to consider. defaults to ingredients stored in ingredients service
  */
  buildIngredients(arr: IngredientStats[] = this.ingredientsService.ingredients) {
    let deviation = 0; // Init the deviation variable
    this.ingredientList = JSON.parse(JSON.stringify(arr)); // Deep copy the input 
    let i = this.ingredientList.length;
    const validA = this.percA > 0;
    const validB = this.percB > 0;
    const validC = this.percC > 0;
    const validD = this.percD > 0;
    const validE = this.percE > 0;

    // Sort and Filter out unwanted materials
    this.ingredientList.sort((a, b) => a.Total - b.Total);
    while (i > 0) {
      i--;
      deviation = // Measure if an ingredient goes over the maximum viable for the target
        Math.max((this.ingredientList[i].A / this.maxMagamin) - this.percA, 0) +
        Math.max((this.ingredientList[i].B / this.maxMagamin) - this.percB, 0) +
        Math.max((this.ingredientList[i].C / this.maxMagamin) - this.percC, 0) +
        Math.max((this.ingredientList[i].D / this.maxMagamin) - this.percD, 0) +
        Math.max((this.ingredientList[i].E / this.maxMagamin) - this.percE, 0);

      if (deviation > this.topDeviate || // Remove ingredients that don't match filters and deviate too far.
        this.ingredientList[i].Avail == 0 || // and are empty
        (this.ingredientList[i].Taste < 0 && this.traits[Senses.Taste]) ||
        (this.ingredientList[i].Touch < 0 && this.traits[Senses.Touch]) ||
        (this.ingredientList[i].Smell < 0 && this.traits[Senses.Smell]) ||
        (this.ingredientList[i].Sight < 0 && this.traits[Senses.Sight]) ||
        (this.ingredientList[i].Sound < 0 && this.traits[Senses.Sound]) ||
        !(((this.ingredientList[i].A > 0) == validA && validA) || // This section checks to see if the ingredient has anything of value to add.  
          ((this.ingredientList[i].B > 0) == validB && validB) || // No point adding an ingredient that is below deviation but has no value.
          ((this.ingredientList[i].C > 0) == validC && validC) ||
          ((this.ingredientList[i].D > 0) == validD && validD) ||
          ((this.ingredientList[i].E > 0) == validE && validE))
      ) {
        this.ingredientList.splice(i, 1); // Cut the fat.
      }
    }
    this.indexerInit(); // Initialize the index based on this new ingredient list.
  }

  /** Controls the flow of the recipe search */
  discoverNewRecipe(recipe: Recipe | undefined) {
    if (recipe === undefined) {
      return;
    }

    // Combine a new ingredient into the recipe
    recipe = this.addIngredient(recipe);

    // @TODO need to improve architecture and detach indices.
    // Check if the current ingredient slot returned nothing
    if (recipe === undefined) {
      if (this.slotIndex <= 0) { // If the first slot returns nothing then we're done.
        this.mainLoopService.started = false;
        this.ingredientsService.ingredientSort();
        this.recipeSort();
        this.recipeDisplay();
        return;
      }
      this.indexer[this.slotIndex - 1]--; // reduce the index of this slot and fill the indices of later slots.
      for (let j = this.slotIndex; j < this.ingredCount; j++) {
        this.indexer[j] = this.indexer[this.slotIndex - 1];
      }
      // Cleaned out a slot, return to top.
      this.slotIndex = 0;
      return;
    }

    // Check if we've reached the final slot
    if (this.slotIndex < this.ingredCount - 1) {
      // @TODO improve recursion based on new knowledge and growth  
      // Recursively move to the next slot. Good for dynamic depth.
      this.slotIndex++;
      this.discoverNewRecipe(recipe);
    } else {
      this.indexer[this.slotIndex]--;
      this.finalizeRecipe(recipe);
    }
    // If we're here then we're coming up for air to check frame time and for a new round.
    this.slotIndex = 0;
  }

  /** Adds an ingredient to the recipe */
  addIngredient(recipe: Recipe): Recipe | undefined {
    const pos = this.indexer[this.slotIndex]
    const result = this.findIngredient(recipe, pos);
    this.indexer[this.slotIndex] = result.pos;
    if (result.deviation === undefined) {
      return;
    }

    const ingredient = this.ingredientList[result.pos];
    if (this.slotIndex != 0) {
      recipe.name += ", ";
    }
    recipe.name += ingredient.name;
    recipe.A += ingredient.A;
    recipe.B += ingredient.B;
    recipe.C += ingredient.C;
    recipe.D += ingredient.D;
    recipe.E += ingredient.E;
    recipe.Total += ingredient.Total;
    recipe.cost += ingredient.cost;
    recipe.Taste = ingredient.Taste < 0 || recipe.Taste < 0 ? -5 : ingredient.Taste > 0 ? 5 : 0;
    recipe.Touch = ingredient.Touch < 0 || recipe.Touch < 0 ? -5 : ingredient.Touch > 0 ? 5 : 0;
    recipe.Smell = ingredient.Smell < 0 || recipe.Smell < 0 ? -5 : ingredient.Smell > 0 ? 5 : 0;
    recipe.Sight = ingredient.Sight < 0 || recipe.Sight < 0 ? -5 : ingredient.Sight > 0 ? 5 : 0;
    recipe.Sound = ingredient.Sound < 0 || recipe.Sound < 0 ? -5 : ingredient.Sound > 0 ? 5 : 0;
    recipe.deviation = result.deviation;
    this.IngredAvail[ingredient.name]--;

    return recipe;
  }

  /** Joins ingredients to form a recipe.
   * @returns Index of the ingredient, or -1 if none fit.
   * @TODO create params for one time or short use recursion variables and move all recipe changes here for better logic control.
   * @TODO ignore trait if illusion selected
   * @TODO allow for division heuristics
   * @TODO allow for required ingredient (something like an Avail reduction and starter recipe and higher slotIndex before calling discover. Watch out for the indexer sweeper tho)
  */
  findIngredient(recipe: Recipe, pos: number): { deviation: number | undefined; pos: number; } {
    let deviation; // Going to need to check for recipe deviation.

    while (pos >= 0) { // While the ingredients at this slot are available, keep looking through them for a viable one.
      this.ingredientList[pos].name
      if (!(this.IngredAvail[this.ingredientList[pos].name] > 0)) { // Ignore ingredients that have no availability count left
        pos--;
        continue;
      }
      const ingredient = this.ingredientList[pos];
      const A = ingredient.A;
      const B = ingredient.B;
      const C = ingredient.C;
      const D = ingredient.D;
      const E = ingredient.E;
      const Total = ingredient.Total;

      // If the final ingredient is added, change from max magamin to the totals in the recipe and get updated ratios.
      if (this.slotIndex < this.ingredCount - 1) {
        deviation =
          Math.max(((recipe.A + A) / this.maxMagamin) - this.percA, 0) +
          Math.max(((recipe.B + B) / this.maxMagamin) - this.percB, 0) +
          Math.max(((recipe.C + C) / this.maxMagamin) - this.percC, 0) +
          Math.max(((recipe.D + D) / this.maxMagamin) - this.percD, 0) +
          Math.max(((recipe.E + E) / this.maxMagamin) - this.percE, 0);
      } else {
        deviation =
          Math.max(((recipe.A + A) / (recipe.Total + Total)) - this.percA, 0) +
          Math.max(((recipe.B + B) / (recipe.Total + Total)) - this.percB, 0) +
          Math.max(((recipe.C + C) / (recipe.Total + Total)) - this.percC, 0) +
          Math.max(((recipe.D + D) / (recipe.Total + Total)) - this.percD, 0) +
          Math.max(((recipe.E + E) / (recipe.Total + Total)) - this.percE, 0);
        this.totalCount++;
      }

      // Skip deviant ingredients and ingredients that go over magamin count. The lowest total magamin is 4 
      // so this will also remove earlier ingredients that go over by assuming all the later ingredients total 4.
      // @TODO make this minimum more dynamic based on the available inventory.
      if (deviation > this.topDeviate || deviation < this.bottomDeviate || ((this.ingredCount - 1 - this.slotIndex) * 4 + recipe.Total + ingredient.Total > this.maxMagamin)) {
        pos--;
      } else {
        break;
      }
    }

    return { deviation, pos };
  }

  /** Finalizes the recipe */
  finalizeRecipe(recipe: Recipe) {
    switch (this.illusion) {
      case Senses.Taste:
        recipe.Taste = 5;
        break;
      case Senses.Touch:
        recipe.Touch = 5;
        break;
      case Senses.Smell:
        recipe.Smell = 5;
        break;
      case Senses.Sight:
        recipe.Sight = 5;
        break;
      case Senses.Sound:
        recipe.Sound = 5;
        break;
    }

    // @TODO merge this check into the ingredient search.
    // @TODO investigate single trait bug.
    // The recipe is added to the end of the list, so if it doesn't meet the criteria filter, pop it back out.
    if (recipe.Total > this.maxMagamin ||
      (recipe.Taste < 5 && this.traits[Senses.Taste]) ||
      (recipe.Touch < 5 && this.traits[Senses.Touch]) ||
      (recipe.Smell < 5 && this.traits[Senses.Smell]) ||
      (recipe.Sight < 5 && this.traits[Senses.Sight]) ||
      (recipe.Sound < 5 && this.traits[Senses.Sound])
    ) {
      this.totalCount++;
      return;
    } else {
      // increase the good recipe counter when finding one, and Rank/price the recipe.
      this.totalCount++;
      this.hitCount++;
      this.recipeRank(recipe);
      this.recipeList.push(recipe)
    }
  }

}