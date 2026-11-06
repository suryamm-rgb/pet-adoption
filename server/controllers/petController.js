import { Pet, PetUpdate } from "../models/index.js";
import * as pets from "../services/petService.js";

export const create = async (req, res) => res.status(201).json(await pets.createPet(req.user, req.body));
export const mine = async (req, res) => res.json(await Pet.find({ ownerId: req.user._id }).sort({ createdAt: -1 }));
export const get = async (req, res) => res.json(await pets.getOwnedPet(req.user, req.params.id));
export const update = async (req, res) => res.json(await pets.updatePet(req.user, req.params.id, req.body));
export const remove = async (req, res) => { await pets.deletePet(req.user, req.params.id); res.status(204).end(); };
export const vaccination = async (req, res) => res.json(await pets.addVaccination(req.user, req.params.id, req.uploaded));
export const photos = async (req, res) => {
  const pet = await pets.getOwnedPet(req.user, req.params.id);
  pet.photos.push(...req.uploaded);
  await pet.save();
  res.json(pet);
};
export const history = async (req, res) => {
  await pets.getOwnedPet(req.user, req.params.id);
  res.json(await PetUpdate.find({ petId: req.params.id }).sort({ createdAt: -1 }).limit(50));
};
